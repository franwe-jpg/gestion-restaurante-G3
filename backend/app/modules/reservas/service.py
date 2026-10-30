"""reservas: reglas de negocio y transacciones."""

from datetime import date, datetime, time

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.reservas import puente, repository
from app.modules.reservas.models import EstadoReserva, Reserva
from app.modules.reservas.schemas import (
    FiltroReservas,
    ReservaCrear,
    ReservaModificar,
    ReservaSalida,
)
from app.shared.excepciones import DatosInvalidosError, NoEncontradoError, ReglaDeNegocioError
from app.shared.paginacion import Pagina


def ahora() -> datetime:
    """Fecha y hora local del servidor. Las pruebas la reemplazan con monkeypatch."""
    return datetime.now()


def _validar_mesa(db: Session, mesa_id: int) -> None:
    if puente.obtener_mesa(db, mesa_id) is None:
        raise NoEncontradoError(f"La mesa {mesa_id} no existe")


def _validar_cliente(db: Session, cliente_id: int) -> None:
    if not puente.existe_cliente(db, cliente_id):
        raise NoEncontradoError(f"El cliente {cliente_id} no existe")


def _validar_momento(fecha: date, hora: time) -> None:
    """S3: la fecha no puede ser anterior a hoy y, si es hoy, la hora debe ser posterior."""
    actual = ahora()
    if fecha < actual.date():
        raise DatosInvalidosError("La fecha de la reserva no puede ser anterior a hoy")
    if fecha == actual.date() and (hora.hour, hora.minute) <= (actual.hour, actual.minute):
        raise DatosInvalidosError("La hora de la reserva debe ser posterior a la hora actual")


def _turno_ocupado(mesa_id: int, fecha: date, hora: time) -> ReglaDeNegocioError:
    """Unico lugar del mensaje de conflicto (R13): lo usan la verificacion previa y el indice."""
    return ReglaDeNegocioError(
        f"La mesa {mesa_id} ya tiene una reserva activa el {fecha} a las {hora:%H:%M}"
    )


def _validar_turno_libre(
    db: Session, mesa_id: int, fecha: date, hora: time, excluir_id: int | None = None
) -> None:
    if repository.existe_reserva_activa(db, mesa_id, fecha, hora, excluir_id):
        raise _turno_ocupado(mesa_id, fecha, hora)


def _confirmar(db: Session, reserva: Reserva) -> None:
    """Guarda la reserva; el indice unico parcial atrapa la carrera entre dos escrituras (R13).

    El error se arma antes de escribir: tras el rollback una reserva ya persistente se recarga
    con los valores de la base y el mensaje nombraria el horario viejo, no el pedido.
    """
    conflicto = _turno_ocupado(reserva.mesa_id, reserva.fecha, reserva.hora)
    try:
        repository.agregar(db, reserva)
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise conflicto from error


def crear_reserva(db: Session, datos: ReservaCrear) -> ReservaSalida:
    _validar_mesa(db, datos.mesa_id)
    _validar_cliente(db, datos.cliente_id)
    _validar_momento(datos.fecha, datos.hora)
    _validar_turno_libre(db, datos.mesa_id, datos.fecha, datos.hora)
    reserva = Reserva(
        mesa_id=datos.mesa_id,
        cliente_id=datos.cliente_id,
        fecha=datos.fecha,
        hora=datos.hora,
        cantidad_personas=datos.cantidad_personas,
        estado=EstadoReserva.ACTIVA,
    )
    _confirmar(db, reserva)
    return ReservaSalida.model_validate(reserva)


def _obtener(db: Session, reserva_id: int) -> Reserva:
    reserva = repository.obtener(db, reserva_id)
    if reserva is None:
        raise NoEncontradoError(f"La reserva {reserva_id} no existe")
    return reserva


def _validar_activa(reserva: Reserva) -> None:
    """S7: solo se modifican las reservas ACTIVA."""
    if reserva.estado != EstadoReserva.ACTIVA:
        raise ReglaDeNegocioError(f"La reserva {reserva.id} no está activa y no se puede modificar")


def obtener_reserva(db: Session, reserva_id: int) -> ReservaSalida:
    return ReservaSalida.model_validate(_obtener(db, reserva_id))


def modificar_reserva(db: Session, reserva_id: int, datos: ReservaModificar) -> ReservaSalida:
    reserva = _obtener(db, reserva_id)
    _validar_activa(reserva)
    _validar_momento(datos.fecha, datos.hora)
    _validar_turno_libre(db, reserva.mesa_id, datos.fecha, datos.hora, excluir_id=reserva.id)
    reserva.fecha = datos.fecha
    reserva.hora = datos.hora
    reserva.cantidad_personas = datos.cantidad_personas
    _confirmar(db, reserva)
    return ReservaSalida.model_validate(reserva)


def listar_reservas(db: Session, filtro: FiltroReservas) -> Pagina[ReservaSalida]:
    reservas, total = repository.listar_reservas(db, filtro, filtro.fecha, filtro.estado)
    return Pagina[ReservaSalida](
        items=[ReservaSalida.model_validate(reserva) for reserva in reservas],
        total=total,
        limit=filtro.limit,
        offset=filtro.offset,
    )
