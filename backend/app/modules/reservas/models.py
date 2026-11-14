"""reservas: tablas del modulo."""

from datetime import date, time
from enum import StrEnum

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class EstadoReserva(StrEnum):
    ACTIVA = "ACTIVA"
    ATENDIDA = "ATENDIDA"
    CANCELADA_ANTICIPADA = "CANCELADA_ANTICIPADA"
    CANCELADA_POR_AUSENCIA = "CANCELADA_POR_AUSENCIA"


class Reserva(Base):
    __tablename__ = "reservas"
    __table_args__ = (
        sa.CheckConstraint("cantidad_personas > 0", name="ck_reservas_cantidad_personas_positiva"),
        # R13: no hay dos reservas ACTIVA en la misma mesa, fecha y hora; las demas no cuentan.
        sa.Index(
            "ux_reservas_mesa_fecha_hora_activa",
            "mesa_id",
            "fecha",
            "hora",
            unique=True,
            sqlite_where=sa.text("estado = 'ACTIVA'"),
        ),
        # La fecha es la columna de filtro y de orden del listado (D-11).
        sa.Index("ix_reservas_fecha_hora", "fecha", "hora"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    # S10: sin clave foranea; la existencia de la mesa y del cliente la valida el puente.
    mesa_id: Mapped[int]
    cliente_id: Mapped[int]
    fecha: Mapped[date]
    hora: Mapped[time]
    cantidad_personas: Mapped[int]
    estado: Mapped[EstadoReserva] = mapped_column(
        sa.Enum(EstadoReserva, native_enum=False), default=EstadoReserva.ACTIVA
    )
