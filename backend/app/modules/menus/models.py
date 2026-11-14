"""menus: tablas del modulo."""

from datetime import date, datetime, time
from decimal import Decimal
from enum import StrEnum

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from app.database import Base
from app.shared.models import Estado, Producto
from app.shared.models.producto import normalizar_nombre

menu_ejecutivo_productos = sa.Table(
    "menu_ejecutivo_productos",
    Base.metadata,
    sa.Column(
        "menu_ejecutivo_id",
        sa.ForeignKey("menus_ejecutivos.id", ondelete="CASCADE"),
        nullable=False,
    ),
    sa.Column(
        "producto_id",
        sa.ForeignKey("productos.id", ondelete="RESTRICT"),
        nullable=False,
    ),
    sa.PrimaryKeyConstraint("menu_ejecutivo_id", "producto_id", name="pk_menu_ejecutivo_productos"),
)


class MenuEjecutivo(Base):
    __tablename__ = "menus_ejecutivos"
    __table_args__ = (
        sa.CheckConstraint("precio_fijo > 0", name="ck_menus_ejecutivos_precio_positivo"),
        sa.Index(
            "ux_menus_ejecutivos_nombre_normalizado",
            "nombre_normalizado",
            unique=True,
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(sa.String(100))
    nombre_normalizado: Mapped[str] = mapped_column(sa.String)
    descripcion: Mapped[str | None] = mapped_column(sa.String(500))
    precio_fijo: Mapped[Decimal] = mapped_column(sa.Numeric(10, 2))
    estado: Mapped[Estado] = mapped_column(
        sa.Enum(Estado, native_enum=False), default=Estado.HABILITADO
    )
    seccion_id: Mapped[int] = mapped_column(
        sa.ForeignKey("secciones.id", ondelete="RESTRICT"), index=True
    )
    productos: Mapped[list[Producto]] = relationship(
        secondary=menu_ejecutivo_productos,
        order_by=Producto.id,
        lazy="selectin",
    )

    @validates("nombre")
    def _sincronizar_nombre_normalizado(self, _clave: str, nombre: str) -> str:
        self.nombre_normalizado = normalizar_nombre(nombre)
        return nombre


class TipoPromocion(StrEnum):
    PORCENTAJE = "PORCENTAJE"
    PRECIO_FIJO = "PRECIO_FIJO"
    NXM = "NXM"


class DiaSemana(StrEnum):
    LUNES = "LUNES"
    MARTES = "MARTES"
    MIERCOLES = "MIERCOLES"
    JUEVES = "JUEVES"
    VIERNES = "VIERNES"
    SABADO = "SABADO"
    DOMINGO = "DOMINGO"


promocion_productos = sa.Table(
    "promocion_productos",
    Base.metadata,
    sa.Column(
        "promocion_id",
        sa.ForeignKey("promociones.id", ondelete="CASCADE"),
        nullable=False,
    ),
    sa.Column(
        "producto_id",
        sa.ForeignKey("productos.id", ondelete="RESTRICT"),
        nullable=False,
    ),
    sa.PrimaryKeyConstraint("promocion_id", "producto_id", name="pk_promocion_productos"),
)


class Promocion(Base):
    __tablename__ = "promociones"
    __table_args__ = (
        sa.CheckConstraint("fecha_hasta >= fecha_desde", name="ck_promociones_fechas"),
        sa.CheckConstraint(
            "(hora_desde IS NULL AND hora_hasta IS NULL) OR "
            "(hora_desde IS NOT NULL AND hora_hasta IS NOT NULL AND hora_hasta > hora_desde)",
            name="ck_promociones_horario",
        ),
        sa.CheckConstraint(
            "(tipo <> 'PORCENTAJE' OR (descuento_porcentaje BETWEEN 1 AND 100 "
            "AND precio_fijo IS NULL AND cant_lleva IS NULL AND cant_paga IS NULL))",
            name="ck_promociones_porcentaje",
        ),
        sa.CheckConstraint(
            "(tipo <> 'PRECIO_FIJO' OR (precio_fijo > 0 AND descuento_porcentaje IS NULL "
            "AND cant_lleva IS NULL AND cant_paga IS NULL))",
            name="ck_promociones_precio_fijo",
        ),
        sa.CheckConstraint(
            "(tipo <> 'NXM' OR (cant_lleva > 0 AND cant_paga > 0 AND cant_paga < cant_lleva "
            "AND descuento_porcentaje IS NULL AND precio_fijo IS NULL))",
            name="ck_promociones_nxm",
        ),
        sa.Index("ux_promociones_nombre_normalizado", "nombre_normalizado", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(sa.String(100))
    nombre_normalizado: Mapped[str] = mapped_column(sa.String)
    tipo: Mapped[TipoPromocion] = mapped_column(sa.Enum(TipoPromocion, native_enum=False))
    descripcion: Mapped[str | None] = mapped_column(sa.String(500))
    fecha_desde: Mapped[date] = mapped_column(sa.Date())
    fecha_hasta: Mapped[date] = mapped_column(sa.Date())
    dias_semana: Mapped[list[str]] = mapped_column(sa.JSON)
    hora_desde: Mapped[time | None] = mapped_column(sa.Time())
    hora_hasta: Mapped[time | None] = mapped_column(sa.Time())
    descuento_porcentaje: Mapped[int | None]
    precio_fijo: Mapped[Decimal | None] = mapped_column(sa.Numeric(10, 2))
    cant_lleva: Mapped[int | None]
    cant_paga: Mapped[int | None]
    estado: Mapped[Estado] = mapped_column(
        sa.Enum(Estado, native_enum=False), default=Estado.HABILITADO
    )
    fecha_hora_finalizacion: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))
    productos: Mapped[list[Producto]] = relationship(
        secondary=promocion_productos,
        order_by=Producto.id,
        lazy="selectin",
    )

    @validates("nombre")
    def _sincronizar_nombre_normalizado(self, _clave: str, nombre: str) -> str:
        self.nombre_normalizado = normalizar_nombre(nombre)
        return nombre
