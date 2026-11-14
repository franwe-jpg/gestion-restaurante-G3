"""Servicio de usuarios: sesion, hash y credenciales (HU-TR-01, P1)."""

import hashlib
from datetime import UTC, datetime, timedelta

import bcrypt
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.usuarios import service
from app.modules.usuarios.models import Sesion, Usuario
from app.shared.excepciones import NoAutenticadoError, ReglaDeNegocioError
from app.shared.models import Estado
from app.shared.models.enums import Rol
from tests.conftest import FabricaUsuario

MENSAJE_CREDENCIALES = "Correo o contraseña incorrectos"


def _ahora() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def _sesiones(db: Session) -> list[Sesion]:
    return list(db.scalars(select(Sesion)).all())


def test_iniciar_sesion_guarda_solo_el_hash_del_token_y_vence_en_8_horas(
    db: Session, fabrica_usuario: FabricaUsuario
) -> None:
    fabrica_usuario()

    resultado = service.iniciar_sesion(db, "ana@resto.com", "Clave1234")

    (sesion,) = _sesiones(db)
    assert sesion.token_hash == hashlib.sha256(resultado.token.encode()).hexdigest()
    assert resultado.token not in sesion.token_hash
    assert sesion.vence_en - sesion.creada_en == timedelta(hours=8)
    assert resultado.vence_en == sesion.vence_en
    assert resultado.tipo == "bearer"
    assert resultado.usuario.roles == [Rol.ENCARGADO]
    assert resultado.usuario.nombre is None


def test_iniciar_sesion_ignora_mayusculas_y_espacios_del_correo(
    db: Session, fabrica_usuario: FabricaUsuario
) -> None:
    fabrica_usuario()

    resultado = service.iniciar_sesion(db, " ANA@Resto.com ", "Clave1234")

    assert resultado.usuario.correo == "ana@resto.com"


@pytest.mark.parametrize(
    ("correo", "contrasena", "estado"),
    [
        ("ana@resto.com", "incorrecta1", Estado.HABILITADO),
        ("nadie@resto.com", "Clave1234", Estado.HABILITADO),
        ("ana@resto.com", "Clave1234", Estado.DESHABILITADO),
        ("ana@resto.com", "a" * 100, Estado.HABILITADO),
    ],
)
def test_iniciar_sesion_con_credenciales_invalidas_da_el_mismo_error(
    db: Session,
    fabrica_usuario: FabricaUsuario,
    correo: str,
    contrasena: str,
    estado: Estado,
) -> None:
    fabrica_usuario(estado=estado)

    with pytest.raises(NoAutenticadoError, match=MENSAJE_CREDENCIALES):
        service.iniciar_sesion(db, correo, contrasena)

    assert _sesiones(db) == []


def test_correo_inexistente_compara_contra_un_hash_ficticio(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    comparados: list[bytes] = []
    verdadero = bcrypt.checkpw

    def espia(clave: bytes, hash_: bytes) -> bool:
        comparados.append(hash_)
        return verdadero(clave, hash_)

    monkeypatch.setattr(service.bcrypt, "checkpw", espia)

    with pytest.raises(NoAutenticadoError):
        service.iniciar_sesion(db, "nadie@resto.com", "Clave1234")

    assert len(comparados) == 1


def test_contrasena_hash_no_es_la_clave_y_valida_con_bcrypt(
    db: Session, fabrica_usuario: FabricaUsuario
) -> None:
    usuario = fabrica_usuario(contrasena="Clave1234")

    assert usuario.contrasena_hash != "Clave1234"
    assert usuario.contrasena_hash.startswith("$2")
    assert bcrypt.checkpw(b"Clave1234", usuario.contrasena_hash.encode())


def test_misma_clave_en_dos_usuarios_da_hashes_distintos(
    fabrica_usuario: FabricaUsuario,
) -> None:
    uno = fabrica_usuario(correo="uno@resto.com", contrasena="Clave1234")
    otro = fabrica_usuario(correo="otro@resto.com", contrasena="Clave1234")

    assert uno.contrasena_hash != otro.contrasena_hash


@pytest.mark.parametrize(
    ("antiguedad", "vigente"),
    [
        (timedelta(hours=7, minutes=59), True),
        (timedelta(hours=8, seconds=1), False),
    ],
)
def test_usuario_de_token_respeta_el_vencimiento_de_8_horas(
    db: Session,
    fabrica_usuario: FabricaUsuario,
    monkeypatch: pytest.MonkeyPatch,
    antiguedad: timedelta,
    vigente: bool,
) -> None:
    fabrica_usuario()
    inicio = _ahora()
    monkeypatch.setattr(service, "_ahora", lambda: inicio)
    token = service.iniciar_sesion(db, "ana@resto.com", "Clave1234").token

    monkeypatch.setattr(service, "_ahora", lambda: inicio + antiguedad)
    usuario = service.usuario_de_token(db, token)

    assert (usuario is not None) is vigente


def test_usuario_de_token_devuelve_roles_y_permisos(
    db: Session, fabrica_usuario: FabricaUsuario
) -> None:
    fabrica_usuario(rol=Rol.CHEF)
    token = service.iniciar_sesion(db, "ana@resto.com", "Clave1234").token

    usuario = service.usuario_de_token(db, token)

    assert usuario is not None
    assert usuario.roles == [Rol.CHEF]
    assert "CARTA_VER" in usuario.permisos
    assert "REPORTES_VER" not in usuario.permisos


def test_usuario_de_token_desconocido_o_deshabilitado_es_none(
    db: Session, fabrica_usuario: FabricaUsuario
) -> None:
    usuario = fabrica_usuario()
    token = service.iniciar_sesion(db, "ana@resto.com", "Clave1234").token
    assert service.usuario_de_token(db, "desconocido") is None

    usuario.estado = Estado.DESHABILITADO
    db.commit()

    assert service.usuario_de_token(db, token) is None


def test_cerrar_sesion_borra_solo_esa_sesion(db: Session, fabrica_usuario: FabricaUsuario) -> None:
    fabrica_usuario()
    primera = service.iniciar_sesion(db, "ana@resto.com", "Clave1234").token
    segunda = service.iniciar_sesion(db, "ana@resto.com", "Clave1234").token

    service.cerrar_sesion(db, primera)

    assert service.usuario_de_token(db, primera) is None
    assert service.usuario_de_token(db, segunda) is not None


def test_iniciar_sesion_borra_las_sesiones_vencidas(
    db: Session, fabrica_usuario: FabricaUsuario, monkeypatch: pytest.MonkeyPatch
) -> None:
    fabrica_usuario()
    inicio = _ahora()
    monkeypatch.setattr(service, "_ahora", lambda: inicio)
    vieja = service.iniciar_sesion(db, "ana@resto.com", "Clave1234").token

    monkeypatch.setattr(service, "_ahora", lambda: inicio + timedelta(hours=9))
    nueva = service.iniciar_sesion(db, "ana@resto.com", "Clave1234").token

    hashes = {sesion.token_hash for sesion in _sesiones(db)}
    assert hashes == {hashlib.sha256(nueva.encode()).hexdigest()}
    assert hashlib.sha256(vieja.encode()).hexdigest() not in hashes


def test_registrar_usuario_con_correo_repetido_da_conflicto(
    db: Session, fabrica_usuario: FabricaUsuario
) -> None:
    fabrica_usuario()

    with pytest.raises(ReglaDeNegocioError, match="Ya existe un usuario con el correo"):
        service.registrar_usuario(db, "ANA@resto.com", "Clave1234", Rol.MOZO)


def test_registrar_usuario_no_confirma_la_transaccion(db: Session) -> None:
    service.registrar_usuario(db, "ana@resto.com", "Clave1234", Rol.MOZO)
    db.rollback()

    assert db.scalars(select(Usuario)).all() == []


def test_actualizar_credenciales_con_el_mismo_correo_propio_no_es_repetido(
    db: Session, fabrica_usuario: FabricaUsuario
) -> None:
    usuario = fabrica_usuario()

    service.actualizar_credenciales(db, usuario.id, "ANA@resto.com", None)

    assert usuario.correo == "ANA@resto.com"


def test_actualizar_credenciales_con_correo_de_otro_da_conflicto(
    db: Session, fabrica_usuario: FabricaUsuario
) -> None:
    fabrica_usuario()
    otro = fabrica_usuario(correo="otro@resto.com")

    with pytest.raises(ReglaDeNegocioError, match="Ya existe un usuario con el correo"):
        service.actualizar_credenciales(db, otro.id, "ana@resto.com", None)


def test_actualizar_credenciales_con_contrasena_nueva_borra_las_sesiones(
    db: Session, fabrica_usuario: FabricaUsuario
) -> None:
    usuario = fabrica_usuario()
    token = service.iniciar_sesion(db, "ana@resto.com", "Clave1234").token

    service.actualizar_credenciales(db, usuario.id, "ana@resto.com", "NuevaClave9")
    db.commit()

    assert service.usuario_de_token(db, token) is None
    assert bcrypt.checkpw(b"NuevaClave9", usuario.contrasena_hash.encode())


def test_actualizar_credenciales_sin_contrasena_conserva_la_actual_y_las_sesiones(
    db: Session, fabrica_usuario: FabricaUsuario
) -> None:
    usuario = fabrica_usuario()
    token = service.iniciar_sesion(db, "ana@resto.com", "Clave1234").token

    service.actualizar_credenciales(db, usuario.id, "ana@resto.com", "")
    db.commit()

    assert service.usuario_de_token(db, token) is not None
    assert bcrypt.checkpw(b"Clave1234", usuario.contrasena_hash.encode())


def test_deshabilitar_usuario_borra_las_sesiones(
    db: Session, fabrica_usuario: FabricaUsuario
) -> None:
    usuario = fabrica_usuario()
    token = service.iniciar_sesion(db, "ana@resto.com", "Clave1234").token

    service.deshabilitar_usuario(db, usuario.id)
    db.commit()

    assert usuario.estado == Estado.DESHABILITADO
    assert _sesiones(db) == []
    assert service.usuario_de_token(db, token) is None


def test_correos_por_id_resuelve_varios_en_un_dict(
    db: Session, fabrica_usuario: FabricaUsuario
) -> None:
    uno = fabrica_usuario(correo="uno@resto.com")
    otro = fabrica_usuario(correo="otro@resto.com")

    assert service.correos_por_id(db, [uno.id, otro.id, 999]) == {
        uno.id: "uno@resto.com",
        otro.id: "otro@resto.com",
    }
    assert service.correos_por_id(db, []) == {}


def test_crear_encargado_crea_usuario_habilitado_con_rol_y_puede_iniciar_sesion(
    db: Session,
) -> None:
    service.crear_encargado(db, "jefe@resto.com", "Clave1234")

    resultado = service.iniciar_sesion(db, "jefe@resto.com", "Clave1234")

    assert resultado.usuario.roles == [Rol.ENCARGADO]


def test_crear_encargado_con_correo_repetido_da_conflicto(db: Session) -> None:
    service.crear_encargado(db, "jefe@resto.com", "Clave1234")

    with pytest.raises(ReglaDeNegocioError):
        service.crear_encargado(db, "JEFE@resto.com", "Clave1234")


def test_crear_encargado_con_contrasena_corta_es_invalido(db: Session) -> None:
    from app.shared.excepciones import DatosInvalidosError

    with pytest.raises(DatosInvalidosError):
        service.crear_encargado(db, "jefe@resto.com", "1234567")
