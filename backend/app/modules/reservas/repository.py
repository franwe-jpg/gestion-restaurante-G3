"""reservas: acceso a datos. Nunca confirma la transaccion: lo hace el service (D-10)."""

from datetime import date, time

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.reservas.models import EstadoReserva, Reserva
from app.shared.paginacion import ParametrosPaginacion, aplicar, contar


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


def listar_reservas(
    db: Session,
    parametros: ParametrosPaginacion,
    fecha: date | None,
    estado: EstadoReserva | None,
) -> tuple[list[Reserva], int]:
    """Devuelve la pagina de reservas ordenada por fecha, hora e id, y el total.

    Con `fecha` o `estado`, el listado y el total cuentan solo las reservas que los cumplen.
    """
    consulta = select(Reserva)
    if fecha is not None:
        consulta = consulta.where(Reserva.fecha == fecha)
    if estado is not None:
        consulta = consulta.where(Reserva.estado == estado)
    consulta_ordenada = consulta.order_by(Reserva.fecha, Reserva.hora, Reserva.id)
    filas = db.scalars(aplicar(consulta_ordenada, parametros)).all()
    return list(filas), contar(db, consulta)
