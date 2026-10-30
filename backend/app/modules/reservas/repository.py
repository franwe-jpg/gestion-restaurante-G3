"""reservas: acceso a datos. Nunca confirma la transaccion: lo hace el service (D-10)."""

from datetime import date, time

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.reservas.models import EstadoReserva, Reserva
from app.shared.paginacion import ParametrosPaginacion, aplicar, contar


def agregar(db: Session, reserva: Reserva) -> None:
    db.add(reserva)
    db.flush()


def obtener_reserva(db: Session, reserva_id: int) -> Reserva | None:
    return db.get(Reserva, reserva_id)


def existe_reserva_activa_en_horario(
    db: Session, mesa_id: int, fecha: date, hora: time, excluir_id: int | None = None
) -> bool:
    """Mesa ocupada por otra reserva Activa en la misma fecha y hora (CA 6 de HU-M5-01)."""
    consulta = select(Reserva.id).where(
        Reserva.mesa_id == mesa_id,
        Reserva.fecha == fecha,
        Reserva.hora == hora,
        Reserva.estado == EstadoReserva.ACTIVA,
    )
    if excluir_id is not None:
        consulta = consulta.where(Reserva.id != excluir_id)
    return db.scalar(consulta.limit(1)) is not None


def listar_reservas_por_fecha(
    db: Session, parametros: ParametrosPaginacion, fecha: date
) -> tuple[list[Reserva], int]:
    """Pagina de reservas de un dia, ordenada por hora (HU-M5-03)."""
    consulta = select(Reserva).where(Reserva.fecha == fecha)
    consulta_ordenada = consulta.order_by(Reserva.hora, Reserva.id)
    filas = db.scalars(aplicar(consulta_ordenada, parametros)).all()
    return list(filas), contar(db, consulta)
