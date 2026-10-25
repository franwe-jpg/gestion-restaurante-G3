"""Producto de la carta. Lo referencian otros modulos (menus, atencion, pagos)."""

from decimal import Decimal

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.shared.models.enums import Categoria, Estado


class Producto(Base):
    __tablename__ = "productos"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(sa.String(100))
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
