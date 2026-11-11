"""usuarios: sesiones, contrasenas y alta de usuarios. Es la unica puerta de entrada al modulo."""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from functools import lru_cache

import bcrypt
from pydantic import TypeAdapter, ValidationError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.modules.usuarios import repository
from app.modules.usuarios.models import Sesion, Usuario
from app.modules.usuarios.schemas import SesionSalida, UsuarioSalida
from app.shared.contratos.usuario import UsuarioSesion
from app.shared.credenciales import ContrasenaNueva, Correo
from app.shared.excepciones import DatosInvalidosError, NoAutenticadoError, ReglaDeNegocioError
from app.shared.models import Estado
from app.shared.models.enums import Rol
from app.shared.permisos import permisos_de

DURACION_SESION = timedelta(hours=8)
MENSAJE_CREDENCIALES = "Correo o contraseña incorrectos"
MENSAJE_SESION = "Sesión no válida o vencida"
MAXIMO_BYTES_BCRYPT = 72


def _ahora() -> datetime:
    """Hora UTC sin zona horaria (A7)."""
    return datetime.now(UTC).replace(tzinfo=None)


def _normalizar(correo: str) -> str:
    return correo.strip().casefold()


def _hashear(contrasena: str) -> str:
    sal = bcrypt.gensalt(rounds=get_settings().bcrypt_rondas)
    return bcrypt.hashpw(contrasena.encode("utf-8"), sal).decode("ascii")


@lru_cache
def _hash_ficticio(rondas: int) -> str:
    """Hash de una clave que nadie conoce, para igualar los tiempos con un correo inexistente."""
    return bcrypt.hashpw(secrets.token_bytes(16), bcrypt.gensalt(rounds=rondas)).decode("ascii")


def _contrasena_coincide(contrasena: str, hash_guardado: str) -> bool:
    clave = contrasena.encode("utf-8")
    if len(clave) > MAXIMO_BYTES_BCRYPT:
        return False
    return bcrypt.checkpw(clave, hash_guardado.encode("ascii"))


def _hash_del_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _salida(db: Session, usuario: Usuario) -> UsuarioSalida:
    persona = repository.persona_vinculada(db, usuario.id)
    return UsuarioSalida(
        id=usuario.id,
        correo=usuario.correo,
        roles=repository.roles_de(db, usuario.id),
        nombre=persona[0] if persona else None,
        apellido=persona[1] if persona else None,
    )


def iniciar_sesion(db: Session, correo: str, contrasena: str) -> SesionSalida:
    """Crea una sesion de 8 horas; todo fallo responde el mismo mensaje generico (S10)."""
    usuario = repository.obtener_por_correo_normalizado(db, _normalizar(correo))
    hash_guardado = (
        usuario.contrasena_hash
        if usuario is not None
        else _hash_ficticio(get_settings().bcrypt_rondas)
    )
    coincide = _contrasena_coincide(contrasena, hash_guardado)
    if usuario is None or not coincide or usuario.estado != Estado.HABILITADO:
        raise NoAutenticadoError(MENSAJE_CREDENCIALES)

    ahora = _ahora()
    token = secrets.token_urlsafe(32)
    repository.borrar_vencidas(db, ahora)
    sesion = Sesion(
        token_hash=_hash_del_token(token),
        usuario_id=usuario.id,
        creada_en=ahora,
        vence_en=ahora + DURACION_SESION,
    )
    repository.agregar_sesion(db, sesion)
    db.commit()
    return SesionSalida(token=token, vence_en=sesion.vence_en, usuario=_salida(db, usuario))


def usuario_de_token(db: Session, token: str) -> UsuarioSesion | None:
    """Usuario de una sesion vigente y habilitada; None en cualquier otro caso."""
    sesion = repository.obtener_sesion_por_hash(db, _hash_del_token(token))
    if sesion is None or sesion.vence_en <= _ahora():
        return None
    usuario = repository.obtener(db, sesion.usuario_id)
    if usuario is None or usuario.estado != Estado.HABILITADO:
        return None
    roles = repository.roles_de(db, usuario.id)
    return UsuarioSesion(
        id=usuario.id,
        correo=usuario.correo,
        roles=roles,
        permisos=sorted(permisos_de(roles)),
        vence_en=sesion.vence_en,
    )


def usuario_salida(db: Session, usuario_id: int) -> UsuarioSalida:
    """Datos de GET /sesion: el usuario con el nombre de su mozo o chef vinculado."""
    usuario = repository.obtener(db, usuario_id)
    if usuario is None:
        raise NoAutenticadoError(MENSAJE_SESION)
    return _salida(db, usuario)


def cerrar_sesion(db: Session, token: str) -> None:
    """Borra solo la sesion de este token."""
    repository.borrar_sesion_por_hash(db, _hash_del_token(token))
    db.commit()


def _validar_correo_libre(db: Session, correo: str, excluir_id: int | None = None) -> None:
    if repository.existe_correo(db, _normalizar(correo), excluir_id):
        raise ReglaDeNegocioError(f"Ya existe un usuario con el correo {correo}")


def registrar_usuario(db: Session, correo: str, contrasena: str, rol: Rol) -> Usuario:
    """Crea un usuario habilitado con un rol. Hace flush sin commit: confirma quien llama (A11)."""
    _validar_correo_libre(db, correo)
    usuario = Usuario(
        correo=correo,
        contrasena_hash=_hashear(contrasena),
        estado=Estado.HABILITADO,
    )
    repository.agregar(db, usuario, [rol])
    return usuario


def actualizar_credenciales(
    db: Session, usuario_id: int, correo: str, contrasena: str | None
) -> None:
    """Cambia el correo y, si llega una contrasena, el hash y cierra todas las sesiones (S2).

    Hace flush sin commit: confirma quien llama (A11).
    """
    usuario = repository.obtener(db, usuario_id)
    if usuario is None:
        raise NoAutenticadoError(MENSAJE_SESION)
    _validar_correo_libre(db, correo, usuario.id)
    usuario.correo = correo
    if contrasena:
        usuario.contrasena_hash = _hashear(contrasena)
        repository.borrar_sesiones_de(db, usuario.id)
    db.flush()


def deshabilitar_usuario(db: Session, usuario_id: int) -> None:
    """Baja del usuario: queda deshabilitado y sin sesiones (S4). Hace flush sin commit (A11)."""
    usuario = repository.obtener(db, usuario_id)
    if usuario is None:
        return
    usuario.estado = Estado.DESHABILITADO
    repository.borrar_sesiones_de(db, usuario.id)
    db.flush()


def correos_por_id(db: Session, ids: list[int]) -> dict[int, str]:
    """Correos de varios usuarios en una sola consulta (listados de salon)."""
    return repository.correos_por_id(db, ids)


def crear_encargado(db: Session, correo: str, contrasena: str) -> Usuario:
    """Alta del encargado desde el script: valida, guarda y confirma (S6)."""
    try:
        correo_valido = TypeAdapter(Correo).validate_python(correo)
        contrasena_valida = TypeAdapter(ContrasenaNueva).validate_python(contrasena)
    except ValidationError as error:
        motivos = "; ".join(falla["msg"] for falla in error.errors())
        raise DatosInvalidosError(f"Datos invalidos. {motivos}") from error
    try:
        usuario = registrar_usuario(db, correo_valido, contrasena_valida, Rol.ENCARGADO)
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise ReglaDeNegocioError(f"Ya existe un usuario con el correo {correo}") from error
    return usuario
