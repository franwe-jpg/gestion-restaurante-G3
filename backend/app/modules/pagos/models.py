"""pagos: tablas del modulo."""

from enum import StrEnum

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, validates

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
