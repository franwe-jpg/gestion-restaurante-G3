"""productos: tablas del modulo."""

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from app.database import Base
from app.shared.models import Estado, Producto


class Seccion(Base):
    __tablename__ = "secciones"
    __table_args__ = (
        sa.CheckConstraint("orden > 0", name="ck_secciones_orden_positivo"),
        # A2: dos secciones habilitadas no comparten orden; las deshabilitadas no cuentan.
        sa.Index(
            "ux_secciones_orden_habilitada",
            "orden",
            unique=True,
            sqlite_where=sa.text("estado = 'HABILITADO'"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(sa.String(50))
    # A1: casefold() cubre mas que lower() (tildes, "Ñ"); no se expone en la API.
    nombre_normalizado: Mapped[str] = mapped_column(sa.String, unique=True)
    orden: Mapped[int]
    estado: Mapped[Estado] = mapped_column(
        sa.Enum(Estado, native_enum=False), default=Estado.HABILITADO
    )

    productos: Mapped[list[Producto]] = relationship()

    @validates("nombre")
    def _sincronizar_nombre_normalizado(self, _clave: str, nombre: str) -> str:
        self.nombre_normalizado = nombre.casefold()
        return nombre
