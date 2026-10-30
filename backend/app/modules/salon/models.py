"""salon: tablas del modulo."""

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, validates

from app.database import Base
from app.shared.models import Estado
from app.shared.models.enums import EstadoMesa


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


class Mozo(Base):
    __tablename__ = "mozos"
    __table_args__ = (
        # A1: el DNI identifica a la persona y no se repite.
        sa.UniqueConstraint("dni", name="ux_mozos_dni"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    dni: Mapped[str] = mapped_column(sa.String(8))
    nombre: Mapped[str] = mapped_column(sa.String(60))
    apellido: Mapped[str] = mapped_column(sa.String(60))
    telefono: Mapped[str | None] = mapped_column(sa.String(30))
    estado: Mapped[Estado] = mapped_column(
        sa.Enum(Estado, native_enum=False), default=Estado.HABILITADO
    )


class Mesa(Base):
    __tablename__ = "mesas"
    __table_args__ = (
        sa.CheckConstraint("numero > 0", name="ck_mesas_numero_positivo"),
        sa.CheckConstraint("capacidad > 0", name="ck_mesas_capacidad_positiva"),
        # B1: el numero es unico dentro de su sector.
        sa.UniqueConstraint("sector_id", "numero", name="ux_mesas_sector_numero"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    numero: Mapped[int]
    capacidad: Mapped[int]
    sector_id: Mapped[int] = mapped_column(sa.ForeignKey("sectores.id", ondelete="RESTRICT"))
    estado: Mapped[EstadoMesa] = mapped_column(
        sa.Enum(EstadoMesa, native_enum=False), default=EstadoMesa.LIBRE
    )
