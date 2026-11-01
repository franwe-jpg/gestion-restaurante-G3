"""M4 persistence queries; transactions belong to the service."""

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.atencion.models import Comanda, DetalleComanda
from app.shared.contratos.comanda import ComandaCrear, DetalleComandaSalida, EstadoComanda
from app.shared.paginacion import ParametrosPaginacion, aplicar, contar


def crear_comanda(
    db: Session, datos: ComandaCrear, detalles: list[DetalleComandaSalida]
) -> Comanda:
    comanda = Comanda(
        mesa_id=datos.mesa_id,
        observaciones=datos.observaciones,
        estado=EstadoComanda.ABIERTA,
        detalles=[DetalleComanda(**detalle.model_dump()) for detalle in detalles],
    )
    db.add(comanda)
    db.flush()
    return comanda


def obtener_comanda(db: Session, comanda_id: int) -> Comanda | None:
    """Read an order and its stored lines without changing their historical values."""
    consulta = (
        select(Comanda)
        .options(selectinload(Comanda.detalles))
        .where(Comanda.id == comanda_id)
        .execution_options(populate_existing=True)
    )
    return db.scalar(consulta)


def obtener_abierta_por_mesa(db: Session, mesa_id: int) -> Comanda | None:
    return db.scalar(
        select(Comanda)
        .where(Comanda.mesa_id == mesa_id, Comanda.estado == EstadoComanda.ABIERTA)
        .execution_options(populate_existing=True)
    )


def listar_comandas(
    db: Session,
    parametros: ParametrosPaginacion,
    mesa_id: int | None = None,
    estado: EstadoComanda | None = None,
) -> tuple[list[Comanda], int]:
    consulta = select(Comanda).order_by(Comanda.fecha_hora.desc(), Comanda.id.desc())
    if mesa_id is not None:
        consulta = consulta.where(Comanda.mesa_id == mesa_id)
    if estado is not None:
        consulta = consulta.where(Comanda.estado == estado)
    total = contar(db, consulta)
    return list(db.scalars(aplicar(consulta, parametros))), total
