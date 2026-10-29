"""menus: tablas del modulo."""

from decimal import Decimal

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
