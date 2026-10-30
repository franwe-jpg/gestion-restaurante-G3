"""reservas: reglas de negocio y transacciones."""

from datetime import date, time
from typing import Protocol

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.reservas import repository
from app.modules.reservas.models import EstadoReserva, Reserva
from app.modules.reservas.schemas import (
    MesaResumen,
    ReservaCrear,
    ReservaModificar,
    ReservaSalida,
)
from app.modules.salon import service as salon_service
from app.shared.excepciones import NoEncontradoError, ReglaDeNegocioError
from app.shared.models.enums import EstadoMesa
from app.shared.paginacion import Pagina, ParametrosPaginacion

LIMITE_SELECTOR_MESAS = 100
MENSAJE_SIN_MESA_DISPONIBLE = "No hay mesa disponible para esa fecha y hora"


class _SectorDeLaMesa(Protocol):
    nombre: str


class _MesaConsultada(Protocol):
    """Forma de lo que devuelve `salon.service.obtener_mesa` (RNF-MAN-09): reservas no importa
    `salon.schemas`, solo describe lo que usa de la respuesta del service de salon."""

    id: int
    numero: int
    capacidad: int
    estado: EstadoMesa
    sector: _SectorDeLaMesa


def _validar_fecha_no_pasada(fecha: date) -> None:
    if fecha < date.today():
        raise ReglaDeNegocioError("La fecha de la reserva no puede ser anterior a hoy")


def _validar_mesa_disponible(
    db: Session,
    mesa: _MesaConsultada,
    fecha: date,
    hora: time,
    excluir_id: int | None = None,
) -> None:
    if mesa.estado == EstadoMesa.FUERA_DE_SERVICIO:
        raise ReglaDeNegocioError(MENSAJE_SIN_MESA_DISPONIBLE)
    if repository.existe_reserva_activa_en_horario(db, mesa.id, fecha, hora, excluir_id):
        raise ReglaDeNegocioError(MENSAJE_SIN_MESA_DISPONIBLE)


def _a_salida(reserva: Reserva, mesa: _MesaConsultada) -> ReservaSalida:
    return ReservaSalida(
        id=reserva.id,
        cliente_nombre=reserva.cliente_nombre,
        cliente_telefono=reserva.cliente_telefono,
        fecha=reserva.fecha,
        hora=reserva.hora,
        cantidad_personas=reserva.cantidad_personas,
        mesa=MesaResumen(
            id=mesa.id,
            numero=mesa.numero,
            capacidad=mesa.capacidad,
            sector_nombre=mesa.sector.nombre,
        ),
        estado=reserva.estado,
    )


def _guardar(db: Session, datos: ReservaCrear) -> Reserva:
    reserva = Reserva(
        cliente_nombre=datos.cliente_nombre,
        cliente_telefono=datos.cliente_telefono,
        fecha=datos.fecha,
        hora=datos.hora,
        cantidad_personas=datos.cantidad_personas,
        mesa_id=datos.mesa_id,
        estado=EstadoReserva.ACTIVA,
    )
    try:
        repository.agregar(db, reserva)
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise ReglaDeNegocioError(MENSAJE_SIN_MESA_DISPONIBLE) from error
    return reserva


def crear_reserva(db: Session, datos: ReservaCrear) -> ReservaSalida:
    """HU-M5-01: crea una reserva Activa. El cliente se guarda junto con la reserva (Supuesto
    S1 de la spec: M4 todavía no tiene la entidad Cliente)."""
    _validar_fecha_no_pasada(datos.fecha)
    mesa = salon_service.obtener_mesa(db, datos.mesa_id)
    _validar_mesa_disponible(db, mesa, datos.fecha, datos.hora)
    return _a_salida(_guardar(db, datos), mesa)


def modificar_reserva(db: Session, reserva_id: int, datos: ReservaModificar) -> ReservaSalida:
    """HU-M5-02: cambia fecha, hora o comensales; el cliente y la mesa no se tocan."""
    reserva = repository.obtener_reserva(db, reserva_id)
    if reserva is None:
        raise NoEncontradoError(f"La reserva {reserva_id} no existe")
    _validar_fecha_no_pasada(datos.fecha)
    mesa = salon_service.obtener_mesa(db, reserva.mesa_id)
    _validar_mesa_disponible(db, mesa, datos.fecha, datos.hora, excluir_id=reserva.id)
    reserva.fecha = datos.fecha
    reserva.hora = datos.hora
    reserva.cantidad_personas = datos.cantidad_personas
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise ReglaDeNegocioError(MENSAJE_SIN_MESA_DISPONIBLE) from error
    return _a_salida(reserva, mesa)


def listar_reservas(
    db: Session, parametros: ParametrosPaginacion, fecha: date
) -> Pagina[ReservaSalida]:
    """HU-M5-03: reservas de un dia, ordenadas por hora."""
    filas, total = repository.listar_reservas_por_fecha(db, parametros, fecha)
    items = [
        _a_salida(reserva, salon_service.obtener_mesa(db, reserva.mesa_id)) for reserva in filas
    ]
    return Pagina[ReservaSalida](
        items=items, total=total, limit=parametros.limit, offset=parametros.offset
    )


def listar_mesas_disponibles(db: Session, fecha: date, hora: time) -> list[MesaResumen]:
    """Mesas elegibles para una reserva en una fecha y hora (CA 1 y CA 6 de HU-M5-01): no
    Fuera de servicio y sin otra reserva Activa en ese horario. Lee hasta 100 mesas (Supuesto
    S2: suficiente para el tamaño del salón del proyecto)."""
    pagina = salon_service.listar_mesas(
        db, ParametrosPaginacion(limit=LIMITE_SELECTOR_MESAS, offset=0)
    )
    disponibles = [
        mesa
        for mesa in pagina.items
        if mesa.estado != EstadoMesa.FUERA_DE_SERVICIO
        and not repository.existe_reserva_activa_en_horario(db, mesa.id, fecha, hora)
    ]
    return [
        MesaResumen(
            id=mesa.id,
            numero=mesa.numero,
            capacidad=mesa.capacidad,
            sector_nombre=mesa.sector.nombre,
        )
        for mesa in disponibles
    ]
