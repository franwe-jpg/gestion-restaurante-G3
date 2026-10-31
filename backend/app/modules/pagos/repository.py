"""pagos: acceso a datos. Nunca confirma la transaccion: lo hace el service (D-10)."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.pagos.models import MedioPago
from app.shared.models import Estado
from app.shared.paginacion import ParametrosPaginacion, aplicar, contar


def existe_nombre_normalizado(
    db: Session, nombre_normalizado: str, excluir_id: int | None = None
) -> bool:
    """Busca el nombre solo entre los medios no eliminados (S3)."""
    consulta = select(MedioPago.id).where(
        MedioPago.nombre_normalizado == nombre_normalizado,
        MedioPago.eliminado.is_(False),
    )
    if excluir_id is not None:
        consulta = consulta.where(MedioPago.id != excluir_id)
    return db.scalar(consulta.limit(1)) is not None


def obtener_medio_pago(db: Session, medio_pago_id: int) -> MedioPago | None:
    """Devuelve el medio de pago, o None si no existe o fue eliminado."""
    medio = db.get(MedioPago, medio_pago_id)
    if medio is None or medio.eliminado:
        return None
    return medio


def agregar(db: Session, medio: MedioPago) -> None:
    db.add(medio)
    db.flush()


def listar_medios_pago(
    db: Session, parametros: ParametrosPaginacion, incluir_deshabilitados: bool
) -> tuple[list[MedioPago], int]:
    """Pagina de medios no eliminados ordenada por nombre y el total (HU-M6-07)."""
    consulta = select(MedioPago).where(MedioPago.eliminado.is_(False))
    if not incluir_deshabilitados:
        consulta = consulta.where(MedioPago.estado == Estado.HABILITADO)
    ordenada = consulta.order_by(MedioPago.nombre_normalizado, MedioPago.id)
    filas = db.scalars(aplicar(ordenada, parametros)).all()
    return list(filas), contar(db, consulta)
