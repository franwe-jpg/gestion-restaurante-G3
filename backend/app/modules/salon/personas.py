"""salon: reglas compartidas de Mozo y Chef (A9). Forma parte del service.

Cada persona tiene un `Usuario` vinculado que se crea, actualiza o deshabilita con
`usuarios.service` dentro de la misma transaccion (A11).
"""

from dataclasses import dataclass

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.salon import repository
from app.modules.salon.models import Chef, Mozo
from app.modules.salon.schemas import (
    ChefSalida,
    MozoSalida,
    PersonaCrear,
    PersonaModificar,
    PersonaSalida,
)
from app.modules.usuarios import service as usuarios_service
from app.shared.excepciones import DatosInvalidosError, NoEncontradoError, ReglaDeNegocioError
from app.shared.models import Estado
from app.shared.models.enums import Rol
from app.shared.paginacion import Pagina, ParametrosPaginacion


@dataclass(frozen=True)
class TipoDePersona:
    modelo: type[Mozo | Chef]
    rol: Rol
    nombre: str  # texto de los mensajes: "mozo" o "chef"
    salida: type[PersonaSalida]


MOZO = TipoDePersona(Mozo, Rol.MOZO, "mozo", MozoSalida)
CHEF = TipoDePersona(Chef, Rol.CHEF, "chef", ChefSalida)


def _a_salida(tipo: TipoDePersona, persona: Mozo | Chef, correo: str | None) -> PersonaSalida:
    base = PersonaSalida.model_validate(persona)
    return tipo.salida(**base.model_dump(exclude={"correo"}), correo=correo)


def _correo_de(db: Session, persona: Mozo | Chef) -> str | None:
    if persona.usuario_id is None:
        return None
    return usuarios_service.correos_por_id(db, [persona.usuario_id]).get(persona.usuario_id)


def _validar_dni_libre(
    db: Session, tipo: TipoDePersona, dni: str, excluir_id: int | None = None
) -> None:
    if repository.existe_dni(db, dni, excluir_id, tipo.modelo):
        raise ReglaDeNegocioError(f"Ya existe un {tipo.nombre} con el DNI {dni}")


def _conflicto(tipo: TipoDePersona, datos: PersonaCrear, error: IntegrityError) -> Exception:
    """Una carrera entre dos altas: el mensaje depende de la restriccion que fallo."""
    if "correo_normalizado" in str(error.orig):
        return ReglaDeNegocioError(
            f"Ya existe un usuario con el correo {datos.correo.strip().casefold()}"
        )
    return ReglaDeNegocioError(f"Ya existe un {tipo.nombre} con el DNI {datos.dni}")


def crear(db: Session, tipo: TipoDePersona, datos: PersonaCrear) -> PersonaSalida:
    """Crea la persona y su usuario; si falla uno no se guarda ninguno (D-10)."""
    _validar_dni_libre(db, tipo, datos.dni)
    try:
        usuario = usuarios_service.registrar_usuario(db, datos.correo, datos.contrasena, tipo.rol)
        persona = tipo.modelo(
            dni=datos.dni,
            nombre=datos.nombre,
            apellido=datos.apellido,
            telefono=datos.telefono,
            estado=Estado.HABILITADO,
            usuario_id=usuario.id,
        )
        repository.agregar(db, persona)
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise _conflicto(tipo, datos, error) from error
    return _a_salida(tipo, persona, usuario.correo)


def _guardar_credenciales(
    db: Session, tipo: TipoDePersona, persona: Mozo | Chef, datos: PersonaModificar
) -> None:
    if persona.usuario_id is not None:
        usuarios_service.actualizar_credenciales(
            db, persona.usuario_id, datos.correo, datos.contrasena
        )
        return
    if not datos.contrasena:  # S5: sin usuario previo, la contrasena es obligatoria
        raise DatosInvalidosError(
            f"La contraseña es obligatoria: el {tipo.nombre} no tiene usuario"
        )
    usuario = usuarios_service.registrar_usuario(db, datos.correo, datos.contrasena, tipo.rol)
    persona.usuario_id = usuario.id


def modificar(
    db: Session, tipo: TipoDePersona, persona_id: int, datos: PersonaModificar
) -> PersonaSalida:
    """Reemplaza los datos y las credenciales; un fallo no deja cambios a medias."""
    persona = repository.obtener_persona(db, tipo.modelo, persona_id)
    if persona is None:
        raise NoEncontradoError(f"El {tipo.nombre} {persona_id} no existe")
    _validar_dni_libre(db, tipo, datos.dni, persona.id)
    try:
        _guardar_credenciales(db, tipo, persona, datos)
        persona.dni = datos.dni
        persona.nombre = datos.nombre
        persona.apellido = datos.apellido
        persona.telefono = datos.telefono
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise _conflicto(tipo, datos, error) from error
    return _a_salida(tipo, persona, _correo_de(db, persona))


def dar_de_baja(db: Session, tipo: TipoDePersona, persona_id: int) -> PersonaSalida:
    """Baja logica de la persona; su usuario queda deshabilitado y sin sesiones (S4)."""
    persona = repository.obtener_persona(db, tipo.modelo, persona_id)
    if persona is None:
        raise NoEncontradoError(f"El {tipo.nombre} {persona_id} no existe")
    if persona.estado == Estado.DESHABILITADO:
        raise ReglaDeNegocioError(f"El {tipo.nombre} ya está dado de baja")
    persona.estado = Estado.DESHABILITADO
    if persona.usuario_id is not None:
        usuarios_service.deshabilitar_usuario(db, persona.usuario_id)
    db.commit()
    return _a_salida(tipo, persona, _correo_de(db, persona))


def listar(
    db: Session, tipo: TipoDePersona, parametros: ParametrosPaginacion, estado: Estado | None
) -> Pagina[PersonaSalida]:
    """Pagina de personas con sus correos, resueltos en una sola consulta."""
    filas, total = repository.listar_personas(db, tipo.modelo, parametros, estado)
    ids = [fila.usuario_id for fila in filas if fila.usuario_id is not None]
    correos = usuarios_service.correos_por_id(db, ids)
    return Pagina[PersonaSalida](
        items=[_a_salida(tipo, fila, correos.get(fila.usuario_id)) for fila in filas],
        total=total,
        limit=parametros.limit,
        offset=parametros.offset,
    )
