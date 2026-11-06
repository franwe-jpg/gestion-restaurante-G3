"""pagos: tablas del modulo."""

from datetime import UTC, datetime
from decimal import Decimal
from enum import StrEnum

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from app.database import Base
from app.shared.models import Estado


class TipoMedioPago(StrEnum):
    EFECTIVO = "EFECTIVO"
    TARJETA = "TARJETA"
    TRANSFERENCIA = "TRANSFERENCIA"
    BILLETERA_VIRTUAL = "BILLETERA_VIRTUAL"


class MedioPago(Base):
    __tablename__ = "medios_pago"
    __table_args__ = (
        # A1: unico sin distinguir mayusculas ni espacios, solo entre los no eliminados (S3).
        sa.Index(
            "ux_medios_pago_nombre_normalizado",
            "nombre_normalizado",
            unique=True,
            sqlite_where=sa.text("eliminado = 0"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(sa.String(50))
    # No se expone en la API: lo mantiene el validador de `nombre`.
    nombre_normalizado: Mapped[str] = mapped_column(sa.String)
    tipo: Mapped[TipoMedioPago] = mapped_column(sa.Enum(TipoMedioPago, native_enum=False))
    descripcion: Mapped[str | None] = mapped_column(sa.String(200))
    estado: Mapped[Estado] = mapped_column(
        sa.Enum(Estado, native_enum=False), default=Estado.HABILITADO
    )
    # Baja logica (A1): la fila se conserva para los cobros que la referencien.
    eliminado: Mapped[bool] = mapped_column(default=False)

    @validates("nombre")
    def _sincronizar_nombre_normalizado(self, _clave: str, nombre: str) -> str:
        self.nombre_normalizado = nombre.strip().casefold()
        return nombre


class EstadoFactura(StrEnum):
    ADEUDADA = "ADEUDADA"
    PAGADA = "PAGADA"


def _ahora() -> datetime:
    return datetime.now(UTC)


class Factura(Base):
    __tablename__ = "facturas"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Referencia por id, sin FK a otro modulo (RNF-MAN-09). Unica: una factura por comanda.
    comanda_id: Mapped[int] = mapped_column(sa.Integer, unique=True)
    fecha_emision: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=_ahora)
    total: Mapped[Decimal] = mapped_column(sa.Numeric(10, 2))
    saldo_pendiente: Mapped[Decimal] = mapped_column(sa.Numeric(10, 2))
    estado: Mapped[EstadoFactura] = mapped_column(
        sa.Enum(EstadoFactura, native_enum=False), default=EstadoFactura.ADEUDADA
    )
    detalles: Mapped[list["DetalleFactura"]] = relationship(
        back_populates="factura", order_by="DetalleFactura.id"
    )
    cobros: Mapped[list["Cobro"]] = relationship(back_populates="factura", order_by="Cobro.id")


class DetalleFactura(Base):
    __tablename__ = "detalles_factura"
    __table_args__ = (
        sa.CheckConstraint(
            "(producto_id IS NULL) <> (menu_ejecutivo_id IS NULL)",
            name="ck_detalles_factura_producto_xor_menu",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    factura_id: Mapped[int] = mapped_column(sa.ForeignKey("facturas.id"))
    producto_id: Mapped[int | None] = mapped_column(sa.Integer)
    menu_ejecutivo_id: Mapped[int | None] = mapped_column(sa.Integer)
    # Copia del nombre al emitir (S4): sigue figurando aunque el producto cambie o se de de baja.
    descripcion: Mapped[str] = mapped_column(sa.String)
    cantidad: Mapped[int] = mapped_column()
    precio_unitario: Mapped[Decimal] = mapped_column(sa.Numeric(10, 2))
    descuento: Mapped[Decimal] = mapped_column(sa.Numeric(10, 2))
    subtotal: Mapped[Decimal] = mapped_column(sa.Numeric(10, 2))
    factura: Mapped[Factura] = relationship(back_populates="detalles")


class Cobro(Base):
    __tablename__ = "cobros"

    id: Mapped[int] = mapped_column(primary_key=True)
    factura_id: Mapped[int] = mapped_column(sa.ForeignKey("facturas.id"))
    medio_pago_id: Mapped[int] = mapped_column(sa.ForeignKey("medios_pago.id"))
    monto: Mapped[Decimal] = mapped_column(sa.Numeric(10, 2))
    fecha_hora: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=_ahora)
    # S2: igual al id del cobro; el service lo asigna en la misma transaccion que lo crea.
    numero_comprobante: Mapped[int | None] = mapped_column(sa.Integer, unique=True)
    factura: Mapped[Factura] = relationship(back_populates="cobros")
