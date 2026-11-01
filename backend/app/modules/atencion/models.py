"""Entidades de clientes y comandas del módulo Atención al Público."""

from datetime import UTC, datetime
from decimal import Decimal

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator

from app.database import Base


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
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    mesa_id: Mapped[int] = mapped_column(sa.ForeignKey("mesas.id", ondelete="RESTRICT"))
    reserva_id: Mapped[int | None] = mapped_column(nullable=True)
    observaciones: Mapped[str | None] = mapped_column(sa.String(500), nullable=True)
    estado: Mapped[str] = mapped_column(sa.String(20), default="ABIERTA")
    fecha_hora: Mapped[datetime] = mapped_column(InstanteUTC(), default=lambda: datetime.now(UTC))
    detalles: Mapped[list["DetalleComanda"]] = relationship(back_populates="comanda")


class DetalleComanda(Base):
    __tablename__ = "detalles_comanda"
    __table_args__ = (
        sa.CheckConstraint("cantidad > 0", name="ck_detalles_comanda_cantidad_positiva"),
        sa.CheckConstraint(
            "(producto_id IS NOT NULL AND menu_ejecutivo_id IS NULL) OR "
            "(producto_id IS NULL AND menu_ejecutivo_id IS NOT NULL)",
            name="ck_detalles_comanda_origen_exclusivo",
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
