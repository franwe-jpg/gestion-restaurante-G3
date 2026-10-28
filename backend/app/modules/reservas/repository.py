"""reservas: acceso a datos. Nunca confirma la transaccion: lo hace el service (D-10)."""

from datetime import date, time

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.reservas.models import EstadoReserva, Reserva


def agregar(db: Session, reserva: Reserva) -> None:
    db.add(reserva)
    db.flush()


def existe_reserva_activa(db: Session, mesa_id: int, fecha: date, hora: time) -> bool:
    """Indica si la mesa ya tiene una reserva ACTIVA en esa fecha y hora exactas (R13)."""
    consulta = select(Reserva.id).where(
        Reserva.mesa_id == mesa_id,
        Reserva.fecha == fecha,
        Reserva.hora == hora,
        Reserva.estado == EstadoReserva.ACTIVA,
    )
    return db.scalar(consulta.limit(1)) is not None
