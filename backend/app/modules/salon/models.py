"""salon: tablas del modulo."""

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, validates

from app.database import Base
from app.shared.models import Estado


class Sector(Base):
    __tablename__ = "sectores"
    __table_args__ = (
        # A1: el nombre es unico sin distinguir mayusculas ni espacios.
        sa.Index("ux_sectores_nombre_normalizado", "nombre_normalizado", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(sa.String(30))
    # No se expone en la API: lo mantiene el validador de `nombre`.
    nombre_normalizado: Mapped[str] = mapped_column(sa.String)
    descripcion: Mapped[str | None] = mapped_column(sa.String(200))
    estado: Mapped[Estado] = mapped_column(
        sa.Enum(Estado, native_enum=False), default=Estado.HABILITADO
    )

    @validates("nombre")
    def _sincronizar_nombre_normalizado(self, _clave: str, nombre: str) -> str:
        self.nombre_normalizado = nombre.strip().casefold()
        return nombre
