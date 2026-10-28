"""reservas: reglas de negocio y transacciones."""

from datetime import date, datetime, time

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.reservas import puente, repository
from app.modules.reservas.models import EstadoReserva, Reserva
from app.modules.reservas.schemas import ReservaCrear, ReservaSalida
from app.shared.excepciones import DatosInvalidosError, NoEncontradoError, ReglaDeNegocioError


def ahora() -> datetime:
    """Fecha y hora local del servidor. Las pruebas la reemplazan con monkeypatch."""
    return datetime.now()


def _obtener_mesa(db: Session, mesa_id: int) -> puente.MesaReservable:
    mesa = puente.obtener_mesa(db, mesa_id)
    if mesa is None:
        raise NoEncontradoError(f"La mesa {mesa_id} no existe")
    return mesa


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


def _validar_capacidad(mesa: puente.MesaReservable, cantidad_personas: int) -> None:
    """S5: solo se controla cuando el puente informa la capacidad de la mesa."""
    if mesa.capacidad is not None and cantidad_personas > mesa.capacidad:
        raise DatosInvalidosError(
            f"La mesa {mesa.id} tiene capacidad para {mesa.capacidad} personas "
            f"y la reserva pide {cantidad_personas}"
        )


def _turno_ocupado(mesa_id: int, fecha: date, hora: time) -> ReglaDeNegocioError:
    """Unico lugar del mensaje de conflicto (R13): lo usan la verificacion previa y el indice."""
    return ReglaDeNegocioError(
        f"La mesa {mesa_id} ya tiene una reserva activa el {fecha} a las {hora:%H:%M}"
    )


def _validar_turno_libre(db: Session, mesa_id: int, fecha: date, hora: time) -> None:
    if repository.existe_reserva_activa(db, mesa_id, fecha, hora):
        raise _turno_ocupado(mesa_id, fecha, hora)


def _confirmar(db: Session, reserva: Reserva) -> None:
    """Guarda la reserva; el indice unico parcial atrapa la carrera entre dos altas (R13)."""
    try:
        repository.agregar(db, reserva)
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise _turno_ocupado(reserva.mesa_id, reserva.fecha, reserva.hora) from error


def crear_reserva(db: Session, datos: ReservaCrear) -> ReservaSalida:
    mesa = _obtener_mesa(db, datos.mesa_id)
    _validar_cliente(db, datos.cliente_id)
    _validar_momento(datos.fecha, datos.hora)
    _validar_capacidad(mesa, datos.cantidad_personas)
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
