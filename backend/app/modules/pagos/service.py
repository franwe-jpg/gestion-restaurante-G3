"""pagos: reglas de negocio y transacciones."""

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.pagos import repository
from app.modules.pagos.models import MedioPago
from app.modules.pagos.schemas import (
    FiltroMediosPago,
    MedioPagoCrear,
    MedioPagoModificar,
    MedioPagoSalida,
)
from app.shared.excepciones import NoEncontradoError, ReglaDeNegocioError
from app.shared.models import Estado
from app.shared.paginacion import Pagina

MENSAJE_DUPLICADO = "El medio de pago ya existe"


def _validar_nombre_libre(db: Session, nombre: str, excluir_id: int | None = None) -> None:
    if repository.existe_nombre_normalizado(db, nombre.strip().casefold(), excluir_id):
        raise ReglaDeNegocioError(MENSAJE_DUPLICADO)


def _obtener(db: Session, medio_pago_id: int) -> MedioPago:
    medio = repository.obtener_medio_pago(db, medio_pago_id)
    if medio is None:
        raise NoEncontradoError(f"El medio de pago {medio_pago_id} no existe")
    return medio


def _confirmar(db: Session, nuevo: MedioPago | None = None) -> None:
    """Agrega el medio nuevo (si hay) y confirma; un nombre repetido por carrera da 409."""
    try:
        if nuevo is not None:
            repository.agregar(db, nuevo)
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise ReglaDeNegocioError(MENSAJE_DUPLICADO) from error


def crear_medio_pago(db: Session, datos: MedioPagoCrear) -> MedioPagoSalida:
    """HU-M6-04: alta, siempre habilitado."""
    _validar_nombre_libre(db, datos.nombre)
    medio = MedioPago(
        nombre=datos.nombre,
        tipo=datos.tipo,
        descripcion=datos.descripcion,
        estado=Estado.HABILITADO,
    )
    _confirmar(db, medio)
    return MedioPagoSalida.model_validate(medio)


def modificar_medio_pago(
    db: Session, medio_pago_id: int, datos: MedioPagoModificar
) -> MedioPagoSalida:
    """HU-M6-05: reemplazo completo, incluido el estado."""
    medio = _obtener(db, medio_pago_id)
    _validar_nombre_libre(db, datos.nombre, medio.id)
    medio.nombre = datos.nombre
    medio.tipo = datos.tipo
    medio.descripcion = datos.descripcion
    medio.estado = datos.estado
    _confirmar(db)
    return MedioPagoSalida.model_validate(medio)


def eliminar_medio_pago(db: Session, medio_pago_id: int) -> None:
    """HU-M6-06: baja logica; la fila se conserva para los cobros que la usaron."""
    medio = _obtener(db, medio_pago_id)
    medio.eliminado = True
    db.commit()


def listar_medios_pago(db: Session, filtro: FiltroMediosPago) -> Pagina[MedioPagoSalida]:
    """HU-M6-07: por defecto solo los habilitados (S2); nunca los eliminados."""
    medios, total = repository.listar_medios_pago(db, filtro, filtro.incluir_deshabilitados)
    return Pagina[MedioPagoSalida](
        items=[MedioPagoSalida.model_validate(medio) for medio in medios],
        total=total,
        limit=filtro.limit,
        offset=filtro.offset,
    )
