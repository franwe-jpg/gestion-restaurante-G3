"""Pruebas de la consulta agregada del reporte de reservas y ausentismo (HU-M5-07)."""

from datetime import date, time

from sqlalchemy import event
from sqlalchemy.orm import Session

from app.modules.reservas import repository
from app.modules.reservas.models import EstadoReserva

DESDE = date(2026, 10, 1)
HASTA = date(2026, 10, 31)


def test_contar_reservas_por_estado_cuenta_los_cuatro_estados(db: Session, fabrica_reserva) -> None:
    fabrica_reserva(mesa_id=1, fecha=date(2026, 10, 5), estado=EstadoReserva.ACTIVA)
    fabrica_reserva(mesa_id=2, fecha=date(2026, 10, 10), estado=EstadoReserva.ATENDIDA)
    fabrica_reserva(mesa_id=3, fecha=date(2026, 10, 15), estado=EstadoReserva.CANCELADA_ANTICIPADA)
    fabrica_reserva(
        mesa_id=4, fecha=date(2026, 10, 20), estado=EstadoReserva.CANCELADA_POR_AUSENCIA
    )

    conteos = repository.contar_reservas_por_estado(db, DESDE, HASTA)

    assert conteos == {
        EstadoReserva.ACTIVA: 1,
        EstadoReserva.ATENDIDA: 1,
        EstadoReserva.CANCELADA_ANTICIPADA: 1,
        EstadoReserva.CANCELADA_POR_AUSENCIA: 1,
    }


def test_contar_reservas_por_estado_sin_reservas_de_un_estado_no_lo_incluye(
    db: Session, fabrica_reserva
) -> None:
    fabrica_reserva(fecha=date(2026, 10, 5), estado=EstadoReserva.ACTIVA)

    conteos = repository.contar_reservas_por_estado(db, DESDE, HASTA)

    assert conteos == {EstadoReserva.ACTIVA: 1}
    assert EstadoReserva.ATENDIDA not in conteos


def test_contar_reservas_por_estado_incluye_los_bordes_del_periodo(
    db: Session, fabrica_reserva
) -> None:
    fabrica_reserva(mesa_id=1, fecha=DESDE, estado=EstadoReserva.ACTIVA)
    fabrica_reserva(mesa_id=2, fecha=HASTA, estado=EstadoReserva.ATENDIDA)

    conteos = repository.contar_reservas_por_estado(db, DESDE, HASTA)

    assert conteos[EstadoReserva.ACTIVA] == 1
    assert conteos[EstadoReserva.ATENDIDA] == 1


def test_contar_reservas_por_estado_excluye_un_dia_antes_y_un_dia_despues(
    db: Session, fabrica_reserva
) -> None:
    fabrica_reserva(mesa_id=1, fecha=date(2026, 9, 30), estado=EstadoReserva.ACTIVA)
    fabrica_reserva(mesa_id=2, fecha=date(2026, 11, 1), estado=EstadoReserva.ATENDIDA)

    conteos = repository.contar_reservas_por_estado(db, DESDE, HASTA)

    assert conteos == {}


def test_contar_reservas_por_estado_la_hora_no_influye(db: Session, fabrica_reserva) -> None:
    fabrica_reserva(fecha=HASTA, hora=time(23, 59), estado=EstadoReserva.ACTIVA)

    conteos = repository.contar_reservas_por_estado(db, DESDE, HASTA)

    assert conteos[EstadoReserva.ACTIVA] == 1


def test_contar_reservas_por_estado_ejecuta_una_sola_sentencia_sql(
    db: Session, fabrica_reserva
) -> None:
    fabrica_reserva(fecha=date(2026, 10, 5), estado=EstadoReserva.ACTIVA)
    capturado: list[tuple[str, tuple]] = []

    def capturar(_conexion, _cursor, sentencia, parametros, _contexto, _varias) -> None:
        capturado.append((sentencia, parametros))

    motor = db.get_bind()
    event.listen(motor, "before_cursor_execute", capturar)
    try:
        repository.contar_reservas_por_estado(db, DESDE, HASTA)
    finally:
        event.remove(motor, "before_cursor_execute", capturar)

    assert len(capturado) == 1
