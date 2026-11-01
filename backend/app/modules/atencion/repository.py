"""Consultas de clientes y comandas; la transacción pertenece al servicio."""

from sqlalchemy import exists, or_, select, update
from sqlalchemy.orm import Session, selectinload

from app.modules.atencion.models import (
    Cliente,
    Comanda,
    DetalleComanda,
    estado_segun_entrega,
)
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


def registrar_entrega(db: Session, comanda_id: int, detalle_id: int, cantidad: int) -> bool:
    """Fija `cantidad_entregada` de un detalle de una comanda ABIERTA; sin commit.

    El UPDATE condicional toma el bloqueo de escritura y valida en una sola sentencia que
    el detalle pertenece a la comanda, que ésta está ABIERTA y que `cantidad` no supera lo
    pedido. Devuelve False sin cambios si no afectó ninguna fila; si afectó una, deriva
    `estado_entrega` con la regla única `estado_segun_entrega`.
    """
    abierta = exists().where(Comanda.id == comanda_id, Comanda.estado == EstadoComanda.ABIERTA)
    resultado = db.execute(
        update(DetalleComanda)
        .where(
            DetalleComanda.id == detalle_id,
            DetalleComanda.comanda_id == comanda_id,
            DetalleComanda.cantidad >= cantidad,
            abierta,
        )
        .values(cantidad_entregada=cantidad)
    )
    if resultado.rowcount != 1:
        return False
    detalle = db.get(DetalleComanda, detalle_id, populate_existing=True)
    detalle.estado_entrega = estado_segun_entrega(detalle.cantidad, detalle.cantidad_entregada)
    db.flush()
    return True


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


def obtener_cliente(db: Session, cliente_id: int) -> Cliente | None:
    return db.get(Cliente, cliente_id)


def listar_clientes(
    db: Session, parametros: ParametrosPaginacion, q: str | None
) -> tuple[list[Cliente], int]:
    consulta = select(Cliente)
    if q:
        consulta = consulta.where(
            or_(Cliente.nombre.contains(q, autoescape=True), Cliente.telefono == q)
        )
    total = contar(db, consulta)
    items = list(db.scalars(aplicar(consulta.order_by(Cliente.id), parametros)).all())
    return items, total
