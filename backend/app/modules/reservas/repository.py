"""reservas: acceso a datos. Nunca confirma la transaccion: lo hace el service (D-10)."""

from datetime import date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.reservas.models import EstadoReserva, Reserva
from app.shared.paginacion import ParametrosPaginacion, aplicar, contar

# S69: solo estas reservas ocupan la mesa; las canceladas la liberan.
_ESTADOS_QUE_OCUPAN = (EstadoReserva.ACTIVA, EstadoReserva.ATENDIDA)


def obtener(db: Session, reserva_id: int) -> Reserva | None:
    return db.get(Reserva, reserva_id)


def agregar(db: Session, reserva: Reserva) -> None:
    """Inserta la reserva nueva o vuelca los cambios de una ya persistente (`add` no la repite)."""
    db.add(reserva)
    db.flush()


def _reservas_que_ocupan(
    db: Session,
    instante: datetime,
    ventana: timedelta,
    mesa_id: int | None = None,
    excluir_id: int | None = None,
) -> list[Reserva]:
    """Unica definicion de "mesa ocupada" (S69): reservas ACTIVA o ATENDIDA a menos de `ventana`.

    Una reserva ocupa su mesa si la distancia entre su fecha y hora y el `instante` es menor que
    `ventana` (estricto), a un lado o al otro. La base solo acota por dias, porque SQLite no
    combina fecha y hora: trae los dias que la ventana alcanza (resuelve `ix_reservas_fecha_hora`)
    y la comparacion exacta se hace con instantes reales, tambien entre un dia y el siguiente.
    Ordenadas por fecha, hora e id. `mesa_id` acota a una mesa; `excluir_id`, al modificar, deja
    afuera a la propia reserva para que no choque consigo misma.
    """
    consulta = select(Reserva).where(
        Reserva.fecha.between((instante - ventana).date(), (instante + ventana).date()),
        Reserva.estado.in_(_ESTADOS_QUE_OCUPAN),
    )
    if mesa_id is not None:
        consulta = consulta.where(Reserva.mesa_id == mesa_id)
    if excluir_id is not None:
        consulta = consulta.where(Reserva.id != excluir_id)
    reservas = db.scalars(consulta.order_by(Reserva.fecha, Reserva.hora, Reserva.id))
    return [
        reserva
        for reserva in reservas
        if abs(datetime.combine(reserva.fecha, reserva.hora) - instante) < ventana
    ]


def reserva_que_ocupa_la_mesa(
    db: Session,
    mesa_id: int,
    instante: datetime,
    ventana: timedelta,
    excluir_id: int | None = None,
) -> Reserva | None:
    """La primera reserva (por fecha y hora) que ocupa la mesa en ese instante, o None (R13, S69).

    Devuelve la reserva y no un booleano porque el mensaje del 409 nombra su fecha y su hora.
    """
    reservas = _reservas_que_ocupan(db, instante, ventana, mesa_id, excluir_id)
    return reservas[0] if reservas else None


def ids_de_mesas_ocupadas(db: Session, instante: datetime, ventana: timedelta) -> set[int]:
    """Ids de las mesas ocupadas en ese instante (issue #61, S69).

    Es la misma definicion que usa `reserva_que_ocupa_la_mesa`: la lista de mesas disponibles
    nunca ofrece una mesa que el alta rechazaria.
    """
    return {reserva.mesa_id for reserva in _reservas_que_ocupan(db, instante, ventana)}


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


def contar_reservas_por_estado(db: Session, desde: date, hasta: date) -> dict[EstadoReserva, int]:
    """Cuántas reservas hay en cada estado con `fecha` en [desde, hasta], ambos incluidos
    (HU-M5-07).

    Una sola consulta agregada, resuelta con el índice `ix_reservas_fecha_hora`. Los estados sin
    reservas en el período no aparecen en el resultado: el que lo lee los toma como 0.
    """
    consulta = (
        select(Reserva.estado, func.count(Reserva.id))
        .where(Reserva.fecha.between(desde, hasta))
        .group_by(Reserva.estado)
    )
    return dict(db.execute(consulta).all())
