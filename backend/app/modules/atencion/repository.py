"""Consultas de clientes y comandas; la transacción pertenece al servicio."""

from datetime import datetime

from sqlalchemy import Integer, cast, exists, func, or_, select, update
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
    db: Session,
    datos: ComandaCrear,
    detalles: list[DetalleComandaSalida],
    reserva_id: int | None = None,
) -> Comanda:
    comanda = Comanda(
        mesa_id=datos.mesa_id,
        reserva_id=reserva_id,
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


def agregar_detalles(db: Session, comanda: Comanda, detalles: list[DetalleComandaSalida]) -> None:
    comanda.detalles.extend(DetalleComanda(**detalle.model_dump()) for detalle in detalles)
    db.flush()


def quitar_detalles(db: Session, comanda: Comanda, detalle_ids: set[int]) -> None:
    for detalle in list(comanda.detalles):
        if detalle.id in detalle_ids:
            comanda.detalles.remove(detalle)
            db.delete(detalle)
    db.flush()


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


def crear_cliente(db: Session, nombre: str, telefono: str) -> Cliente:
    """Agrega un cliente y obtiene su id con `flush`; sin commit, la transacción es del llamador."""
    cliente = Cliente(nombre=nombre, telefono=telefono)
    db.add(cliente)
    db.flush()
    return cliente


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


def promocion_fue_aplicada(db: Session, promocion_id: int) -> bool:
    """Indica si alguna línea de comanda referencia la promoción; solo lectura."""
    consulta = select(DetalleComanda.id).where(DetalleComanda.promocion_id == promocion_id).limit(1)
    return db.scalar(consulta) is not None


def sumar_productos_pedidos(
    db: Session, desde: datetime, hasta: datetime, desplazamiento_horas: int
) -> list[tuple[int, int, int, int]]:
    """Suma `cantidad` por producto, día y hora locales; solo lectura, sin commit.

    Cuentan las líneas de producto de comandas ABIERTA y CERRADA con
    `desde <= fecha_hora < hasta`. `dia_semana` va de 0 (lunes) a 6 (domingo).
    """
    modificador = f"{desplazamiento_horas:+d} hours"
    dia = (cast(func.strftime("%w", Comanda.fecha_hora, modificador), Integer) + 6) % 7
    hora = cast(func.strftime("%H", Comanda.fecha_hora, modificador), Integer)
    consulta = (
        select(DetalleComanda.producto_id, dia, hora, func.sum(DetalleComanda.cantidad))
        .join(Comanda, Comanda.id == DetalleComanda.comanda_id)
        .where(
            Comanda.fecha_hora >= desde,
            Comanda.fecha_hora < hasta,
            Comanda.estado.in_([EstadoComanda.ABIERTA, EstadoComanda.CERRADA]),
            DetalleComanda.producto_id.is_not(None),
        )
        .group_by(DetalleComanda.producto_id, dia, hora)
    )
    return [tuple(fila) for fila in db.execute(consulta)]
