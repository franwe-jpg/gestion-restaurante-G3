"""Entidades de clientes y comandas del módulo Atención al Público."""

from datetime import UTC, datetime
from decimal import Decimal

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator

from app.database import Base
from app.shared.contratos.comanda import EstadoEntrega


class InstanteUTC(TypeDecorator[datetime]):
    """Store an explicit UTC offset so SQLite cannot discard timezone information."""

    impl = sa.String(32)
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: sa.Dialect) -> str | None:
        if value is None:
            return None
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("An aware creation timestamp is required")
        return value.astimezone(UTC).isoformat(timespec="microseconds")

    def process_result_value(self, value: str | None, dialect: sa.Dialect) -> datetime | None:
        if value is None:
            return None
        instante = datetime.fromisoformat(value)
        if instante.tzinfo is None or instante.utcoffset() != UTC.utcoffset(None):
            raise ValueError("Stored creation timestamp must include a UTC offset")
        return instante.astimezone(UTC)


class Comanda(Base):
    __tablename__ = "comandas"
    __table_args__ = (
        sa.Index(
            "ux_comandas_mesa_abierta",
            "mesa_id",
            unique=True,
            sqlite_where=sa.text("estado = 'ABIERTA'"),
        ),
        sa.Index("ix_comandas_fecha_hora", "fecha_hora"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    mesa_id: Mapped[int] = mapped_column(sa.ForeignKey("mesas.id", ondelete="RESTRICT"))
    # Mozo que la atiende (M3). Referencia por id, sin FK entre módulos (HU-M3-13).
    mozo_id: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    reserva_id: Mapped[int | None] = mapped_column(nullable=True)
    observaciones: Mapped[str | None] = mapped_column(sa.String(500), nullable=True)
    estado: Mapped[str] = mapped_column(sa.String(20), default="ABIERTA")
    fecha_hora: Mapped[datetime] = mapped_column(InstanteUTC(), default=lambda: datetime.now(UTC))
    detalles: Mapped[list["DetalleComanda"]] = relationship(
        back_populates="comanda", order_by="DetalleComanda.id"
    )


def estado_segun_entrega(cantidad: int, cantidad_entregada: int) -> EstadoEntrega:
    """Única regla del estado de entrega: ENTREGADO si y solo si se entregó todo lo pedido.

    Toda operación que cambie `cantidad` o `cantidad_entregada` de un detalle (entregas,
    modificar una comanda) debe asignar `estado_entrega` con esta función.
    """
    if cantidad_entregada == cantidad:
        return EstadoEntrega.ENTREGADO
    return EstadoEntrega.PENDIENTE


class DetalleComanda(Base):
    __tablename__ = "detalles_comanda"
    __table_args__ = (
        sa.Index("ix_detalles_comanda_comanda_id", "comanda_id"),
        sa.CheckConstraint("cantidad > 0", name="ck_detalles_comanda_cantidad_positiva"),
        sa.CheckConstraint(
            "(producto_id IS NOT NULL AND menu_ejecutivo_id IS NULL) OR "
            "(producto_id IS NULL AND menu_ejecutivo_id IS NOT NULL)",
            name="ck_detalles_comanda_origen_exclusivo",
        ),
        sa.CheckConstraint(
            "cantidad_entregada >= 0 AND cantidad_entregada <= cantidad",
            name="ck_detalles_comanda_cantidad_entregada_rango",
        ),
        sa.CheckConstraint(
            "cantidad_lista >= 0 AND cantidad_lista <= cantidad",
            name="ck_detalles_comanda_cantidad_lista_rango",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    comanda_id: Mapped[int] = mapped_column(sa.ForeignKey("comandas.id", ondelete="CASCADE"))
    producto_id: Mapped[int | None] = mapped_column(
        sa.ForeignKey("productos.id", ondelete="RESTRICT"), nullable=True
    )
    menu_ejecutivo_id: Mapped[int | None] = mapped_column(
        sa.ForeignKey("menus_ejecutivos.id", ondelete="RESTRICT"), nullable=True
    )
    cantidad: Mapped[int] = mapped_column()
    cantidad_entregada: Mapped[int] = mapped_column(default=0, server_default="0")
    cantidad_lista: Mapped[int] = mapped_column(default=0, server_default="0")
    estado_entrega: Mapped[str] = mapped_column(sa.String(20), default="PENDIENTE")
    precio_unitario: Mapped[Decimal] = mapped_column(sa.Numeric(10, 2))
    descuento: Mapped[Decimal] = mapped_column(sa.Numeric(10, 2))
    promocion_id: Mapped[int | None] = mapped_column(nullable=True)
    comanda: Mapped[Comanda] = relationship(back_populates="detalles")


class Cliente(Base):
    __tablename__ = "clientes"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(sa.String)
    telefono: Mapped[str] = mapped_column(sa.String)
