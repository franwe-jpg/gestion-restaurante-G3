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
        # Indice parcial: dos reservas Activas no pueden compartir mesa, fecha y hora (CA 6 de
        # HU-M5-01). Una Cancelada o Atendida no cuenta: puede repetir el horario.
        sa.Index(
            "ux_reservas_mesa_fecha_hora_activa",
            "mesa_id",
            "fecha",
            "hora",
            unique=True,
            sqlite_where=sa.text("estado = 'ACTIVA'"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    # Supuesto S1: mientras M4 no tenga la entidad Cliente, se guarda nombre y telefono en la
    # propia reserva (HU-M5-01). Cuando M4 este lista, una HU de enlace migra a un cliente_id.
    cliente_nombre: Mapped[str] = mapped_column(sa.String(60))
    cliente_telefono: Mapped[str] = mapped_column(sa.String(30))
    fecha: Mapped[date] = mapped_column(sa.Date)
    hora: Mapped[time] = mapped_column(sa.Time)
    cantidad_personas: Mapped[int]
    mesa_id: Mapped[int] = mapped_column(sa.ForeignKey("mesas.id", ondelete="RESTRICT"))
    estado: Mapped[EstadoReserva] = mapped_column(
        sa.Enum(EstadoReserva, native_enum=False), default=EstadoReserva.ACTIVA
    )
