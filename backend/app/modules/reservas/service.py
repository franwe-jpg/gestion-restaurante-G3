"""reservas: reglas de negocio y transacciones."""

from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.reservas import puente, repository
from app.modules.reservas.models import EstadoReserva, Reserva
from app.modules.reservas.schemas import (
    ComandaDesdeReservaCrear,
    FiltroReservas,
    MesaDisponible,
    ReservaCrear,
    ReservaModificar,
    ReservaSalida,
)
from app.shared.contratos.comanda import ComandaSalida, DetalleComandaCrear
from app.shared.excepciones import DatosInvalidosError, NoEncontradoError, ReglaDeNegocioError
from app.shared.models.enums import EstadoMesa
from app.shared.paginacion import Pagina

# S28: el restaurante esta en UTC-3 todo el ano (Argentina no usa horario de verano desde 2009).
# Es un desplazamiento fijo y no `zoneinfo`, para no depender de la base de zonas del sistema.
ZONA_DEL_RESTAURANTE = timezone(timedelta(hours=-3), "ART")


def ahora() -> datetime:
    """Fecha y hora actuales del restaurante (UTC-3), sin zona. Las pruebas la reemplazan.

    Se calcula desde el reloj UTC, asi que no depende de `TZ` del proceso ni del contenedor (S28).
    El resultado no lleva zona: el resto del modulo compara fechas y horas sin zona.
    """
    return datetime.now(ZONA_DEL_RESTAURANTE).replace(tzinfo=None)


def _validar_mesa(db: Session, mesa_id: int) -> None:
    """La mesa debe existir (404) y no estar fuera de servicio (409, S31).

    Se lee una sola vez. OCUPADA no se rechaza: describe el momento presente, no el turno (S30).
    """
    mesa = puente.obtener_mesa(db, mesa_id)
    if mesa is None:
        raise NoEncontradoError(f"La mesa {mesa_id} no existe")
    if mesa.estado == EstadoMesa.FUERA_DE_SERVICIO:
        raise ReglaDeNegocioError(f"La mesa {mesa_id} está fuera de servicio")


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


def _validar_un_cliente(datos: ReservaCrear) -> None:
    """S39: un cliente existente o uno nuevo, nunca los dos ni ninguno. Se comprueba primero."""
    if (datos.cliente_id is None) == (datos.cliente_nuevo is None):
        raise DatosInvalidosError(
            "cliente_id/cliente_nuevo: indique un cliente registrado (cliente_id) "
            "o los datos de un cliente nuevo (cliente_nuevo), no los dos ni ninguno"
        )


def _id_del_cliente(db: Session, datos: ReservaCrear) -> int:
    """El cliente existente o, si no hay, el nuevo recien registrado en M4 (S41)."""
    if datos.cliente_id is not None:
        return datos.cliente_id
    nuevo = datos.cliente_nuevo
    return puente.registrar_cliente(db, nuevo.nombre, nuevo.telefono)


def crear_reserva(db: Session, datos: ReservaCrear) -> ReservaSalida:
    _validar_un_cliente(datos)
    _validar_mesa(db, datos.mesa_id)
    if datos.cliente_id is not None:
        _validar_cliente(db, datos.cliente_id)
    _validar_momento(datos.fecha, datos.hora)
    _validar_turno_libre(db, datos.mesa_id, datos.fecha, datos.hora)
    reserva = Reserva(
        mesa_id=datos.mesa_id,
        cliente_id=_id_del_cliente(db, datos),  # ultimo paso antes de guardar (S41)
        fecha=datos.fecha,
        hora=datos.hora,
        cantidad_personas=datos.cantidad_personas,
        estado=EstadoReserva.ACTIVA,
    )
    _confirmar(db, reserva)  # un solo commit: la reserva y el cliente nuevo
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


# Estados terminales de cancelacion: una reserva en cualquiera de ellos "ya fue cancelada".
_CANCELADAS = frozenset({EstadoReserva.CANCELADA_ANTICIPADA, EstadoReserva.CANCELADA_POR_AUSENCIA})


def _obtener_cancelable(db: Session, reserva_id: int) -> Reserva:
    """La reserva existe (404) y no esta cancelada ni atendida (409), en ese orden (S48)."""
    reserva = _obtener(db, reserva_id)
    if reserva.estado in _CANCELADAS:
        raise ReglaDeNegocioError(f"La reserva {reserva_id} ya fue cancelada")
    if reserva.estado == EstadoReserva.ATENDIDA:
        raise ReglaDeNegocioError(f"La reserva {reserva_id} ya fue atendida y no se puede cancelar")
    return reserva


def _llego_su_hora(reserva: Reserva) -> bool:
    """`(fecha, hora) <= ahora()` comparado en minutos, sin minutos de gracia (S46 y S47)."""
    actual = ahora().replace(second=0, microsecond=0)
    return datetime.combine(reserva.fecha, reserva.hora) <= actual


def cancelar_anticipada(db: Session, reserva_id: int) -> ReservaSalida:
    """HU-M5-04: una reserva ACTIVA cuya hora todavia no llego pasa a CANCELADA_ANTICIPADA."""
    reserva = _obtener_cancelable(db, reserva_id)
    if _llego_su_hora(reserva):
        raise ReglaDeNegocioError(
            f"La reserva {reserva_id} ya llegó a su hora; si el cliente no vino, "
            "cancélela por ausencia"
        )
    reserva.estado = EstadoReserva.CANCELADA_ANTICIPADA
    db.commit()
    return ReservaSalida.model_validate(reserva)


def cancelar_por_ausencia(db: Session, reserva_id: int) -> ReservaSalida:
    """HU-M5-05: una reserva ACTIVA cuya hora ya llego pasa a CANCELADA_POR_AUSENCIA."""
    reserva = _obtener_cancelable(db, reserva_id)
    if not _llego_su_hora(reserva):
        raise ReglaDeNegocioError(
            f"La reserva {reserva_id} todavía no llegó a su hora y no se puede cancelar "
            "por ausencia"
        )
    reserva.estado = EstadoReserva.CANCELADA_POR_AUSENCIA
    db.commit()
    return ReservaSalida.model_validate(reserva)


def _obtener_atendible(db: Session, reserva_id: int) -> Reserva:
    """Existe (404), no esta cancelada ni atendida y es de hoy (409), en ese orden (HU-M5-06).

    Solo cuenta la fecha: la hora de la reserva no se verifica (S63). Mismo orden de estados que
    `_obtener_cancelable`, con mensajes propios porque aqui se atiende, no se cancela.
    """
    reserva = _obtener(db, reserva_id)
    if reserva.estado in _CANCELADAS:
        raise ReglaDeNegocioError(f"La reserva {reserva_id} ya fue cancelada")
    if reserva.estado == EstadoReserva.ATENDIDA:
        raise ReglaDeNegocioError(f"La reserva {reserva_id} ya fue atendida")
    if reserva.fecha != ahora().date():  # S57: la de otra fecha se rechaza, no solo se advierte
        raise ReglaDeNegocioError(f"La reserva {reserva_id} no corresponde al día de hoy")
    return reserva


def _validar_al_menos_un_producto(detalles: list[DetalleComandaCrear]) -> None:
    """S53 (HU-M5-06): al menos una linea con `producto_id`; las de menu se aceptan junto a ella."""
    if all(detalle.producto_id is None for detalle in detalles):
        raise DatosInvalidosError("La comanda debe incluir al menos un producto")


def _conflicto_al_atender(db: Session, reserva_id: int, mesa_id: int) -> ReglaDeNegocioError:
    """Explica un IntegrityError al atender, ya revertido (HU-M5-06, Decision 52).

    En esta transaccion la unica restriccion que puede fallar es el indice unico de comanda
    ABIERTA por mesa de M4. Si otra solicitud ya atendio la reserva (doble envio), se informa
    eso; si no, otra comanda tomo la mesa entre la validacion y el insert.
    """
    try:
        _obtener_atendible(db, reserva_id)
    except ReglaDeNegocioError as estado_actual:
        return estado_actual
    return ReglaDeNegocioError(f"La mesa {mesa_id} ya tiene una comanda abierta")


def crear_comanda(db: Session, reserva_id: int, datos: ComandaDesdeReservaCrear) -> ComandaSalida:
    """HU-M5-06: crea la comanda ABIERTA en la mesa de la reserva y la pasa a ATENDIDA.

    Un solo commit: la comanda, la mesa ocupada (M4/M3) y la reserva atendida, o nada. Las
    verificaciones previas no escriben, asi que quedan fuera del `try`.
    """
    reserva = _obtener_atendible(db, reserva_id)
    _validar_al_menos_un_producto(datos.detalles)
    mesa_id = reserva.mesa_id  # se lee antes: el rollback expira la reserva
    try:
        comanda = puente.crear_comanda_de_reserva(
            db, mesa_id, reserva.id, datos.detalles, datos.observaciones
        )
        reserva.estado = EstadoReserva.ATENDIDA
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise _conflicto_al_atender(db, reserva_id, mesa_id) from error
    except Exception:
        db.rollback()
        raise
    return comanda


def listar_reservas(db: Session, filtro: FiltroReservas) -> Pagina[ReservaSalida]:
    reservas, total = repository.listar_reservas(db, filtro, filtro.fecha, filtro.estado)
    return Pagina[ReservaSalida](
        items=[ReservaSalida.model_validate(reserva) for reserva in reservas],
        total=total,
        limit=filtro.limit,
        offset=filtro.offset,
    )


def listar_mesas_disponibles(db: Session, fecha: date, hora: time) -> list[MesaDisponible]:
    """Mesas que se pueden reservar en ese turno, por sector, numero e id (issue #61).

    El turno debe cumplir las reglas de "no pasado" del alta y se valida antes de leer M3 (S32).
    Figura toda mesa que no esta FUERA_DE_SERVICIO y no tiene una reserva ACTIVA en ese turno;
    OCUPADA figura porque describe el momento presente (S30). Solo lee: no confirma nada.
    """
    _validar_momento(fecha, hora)
    ocupadas = repository.ids_de_mesas_con_reserva_activa(db, fecha, hora)
    disponibles = [
        mesa
        for mesa in puente.listar_mesas(db)
        if mesa.estado != EstadoMesa.FUERA_DE_SERVICIO and mesa.id not in ocupadas
    ]
    disponibles.sort(key=lambda mesa: (mesa.sector.nombre, mesa.numero, mesa.id))
    return [MesaDisponible.model_validate(mesa) for mesa in disponibles]
