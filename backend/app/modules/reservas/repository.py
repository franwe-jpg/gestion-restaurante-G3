"""reservas: acceso a datos. Nunca confirma la transaccion: lo hace el service (D-10)."""

from datetime import date, time

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.reservas.models import EstadoReserva, Reserva
from app.shared.paginacion import ParametrosPaginacion, aplicar, contar


def obtener(db: Session, reserva_id: int) -> Reserva | None:
    return db.get(Reserva, reserva_id)


def agregar(db: Session, reserva: Reserva) -> None:
    """Inserta la reserva nueva o vuelca los cambios de una ya persistente (`add` no la repite)."""
    db.add(reserva)
    db.flush()


def existe_reserva_activa(
    db: Session, mesa_id: int, fecha: date, hora: time, excluir_id: int | None = None
) -> bool:
    """Indica si la mesa ya tiene una reserva ACTIVA en esa fecha y hora exactas (R13).

    Al modificar, `excluir_id` deja afuera a la propia reserva para que no choque consigo misma.
    """
    consulta = select(Reserva.id).where(
        Reserva.mesa_id == mesa_id,
        Reserva.fecha == fecha,
        Reserva.hora == hora,
        Reserva.estado == EstadoReserva.ACTIVA,
    )
    if excluir_id is not None:
        consulta = consulta.where(Reserva.id != excluir_id)
    return db.scalar(consulta.limit(1)) is not None


def ids_de_mesas_con_reserva_activa(db: Session, fecha: date, hora: time) -> set[int]:
    """Ids de las mesas con una reserva ACTIVA en esa fecha y hora exactas (issue #61).

    Es la misma definicion de turno ocupado que usa `existe_reserva_activa`. Una sola consulta
    por `fecha` y `hora`, que resuelve el indice `ix_reservas_fecha_hora`.
    """
    consulta = select(Reserva.mesa_id).where(
        Reserva.fecha == fecha,
        Reserva.hora == hora,
        Reserva.estado == EstadoReserva.ACTIVA,
    )
    return set(db.scalars(consulta))


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
