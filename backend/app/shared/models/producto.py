"""Producto de la carta. Lo referencian otros modulos (menus, atencion, pagos)."""

from decimal import Decimal

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, validates

from app.database import Base
from app.shared.models.enums import Categoria, Estado


def normalizar_nombre(nombre: str) -> str:
    """Forma comparable del nombre: sin espacios en los bordes y sin distinguir mayusculas."""
    return nombre.strip().casefold()


class Producto(Base):
    __tablename__ = "productos"
    __table_args__ = (
        # B1: el nombre es unico dentro de cada categoria (tambien entre deshabilitados).
        sa.Index(
            "ux_productos_categoria_nombre_normalizado",
            "categoria",
            "nombre_normalizado",
            unique=True,
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(sa.String(100))
    # No se expone en la API: lo mantiene el validador de `nombre`.
    nombre_normalizado: Mapped[str] = mapped_column(sa.String)
    categoria: Mapped[Categoria] = mapped_column(sa.Enum(Categoria, native_enum=False))
    precio: Mapped[Decimal] = mapped_column(sa.Numeric(10, 2))
    ingredientes: Mapped[list[str]] = mapped_column(sa.JSON, default=list)
    descripcion: Mapped[str | None] = mapped_column(sa.String(500))
    imagen: Mapped[str | None] = mapped_column(sa.String(255))
    etiquetas: Mapped[list[str]] = mapped_column(sa.JSON, default=list)
    estado: Mapped[Estado] = mapped_column(
        sa.Enum(Estado, native_enum=False), default=Estado.HABILITADO
    )
    seccion_id: Mapped[int] = mapped_column(
        sa.ForeignKey("secciones.id", ondelete="RESTRICT"), index=True
    )

    @validates("nombre")
    def _sincronizar_nombre_normalizado(self, _clave: str, nombre: str) -> str:
        self.nombre_normalizado = normalizar_nombre(nombre)
        return nombre
