"""Pruebas de los esquemas de reservas (HU-M5-01)."""

from datetime import date, time

import pytest
from pydantic import ValidationError

from app.modules.reservas.models import EstadoReserva
from app.modules.reservas.schemas import ReservaCrear, ReservaSalida

CUERPO = {
    "mesa_id": 5,
    "cliente_id": 7,
    "fecha": "2026-11-02",
    "hora": "21:30",
    "cantidad_personas": 4,
}
CAMPOS = list(CUERPO)


def _reserva(**cambios) -> ReservaCrear:
    return ReservaCrear.model_validate(CUERPO | cambios)


def _campos_con_error(**cambios) -> set[str]:
    with pytest.raises(ValidationError) as error:
        _reserva(**cambios)
    return {str(falla["loc"][0]) for falla in error.value.errors()}


# HU-M5-01 CA 1
def test_reserva_crear_acepta_datos_validos() -> None:
    datos = _reserva()

    assert datos.mesa_id == 5
    assert datos.cliente_id == 7
    assert datos.fecha == date(2026, 11, 2)
    assert datos.hora == time(21, 30)
    assert datos.cantidad_personas == 4


# CA 3: los cinco campos son obligatorios y ninguno admite null
@pytest.mark.parametrize("campo", CAMPOS)
def test_reserva_crear_rechaza_campos_faltantes(campo: str) -> None:
    cuerpo = {nombre: valor for nombre, valor in CUERPO.items() if nombre != campo}

    with pytest.raises(ValidationError) as error:
        ReservaCrear.model_validate(cuerpo)

    assert {str(falla["loc"][0]) for falla in error.value.errors()} == {campo}


@pytest.mark.parametrize("campo", CAMPOS)
def test_reserva_crear_rechaza_campos_nulos(campo: str) -> None:
    assert _campos_con_error(**{campo: None}) == {campo}


# CA 7
@pytest.mark.parametrize("cantidad", [0, -1])
def test_reserva_crear_rechaza_cantidad_no_positiva(cantidad: int) -> None:
    assert _campos_con_error(cantidad_personas=cantidad) == {"cantidad_personas"}


# CA 3 y CA 7: enteros estrictos
@pytest.mark.parametrize(
    "campo, valor",
    [
        ("cantidad_personas", 2.5),
        ("cantidad_personas", "4"),
        ("cantidad_personas", True),
        ("mesa_id", 2.5),
        ("mesa_id", "5"),
        ("mesa_id", True),
        ("mesa_id", 0),
        ("mesa_id", -1),
        ("cliente_id", 2.5),
        ("cliente_id", "7"),
        ("cliente_id", True),
        ("cliente_id", 0),
        ("cliente_id", -1),
    ],
)
def test_reserva_crear_rechaza_tipos_laxos(campo: str, valor: object) -> None:
    assert _campos_con_error(**{campo: valor}) == {campo}


@pytest.mark.parametrize(
    "campo, valor",
    [
        ("fecha", "02/11/2026"),
        ("fecha", "2026-13-40"),
        ("hora", "25:00"),
        ("hora", "9pm"),
    ],
)
def test_reserva_crear_rechaza_formatos_de_fecha_y_hora(campo: str, valor: str) -> None:
    assert _campos_con_error(**{campo: valor}) == {campo}


# S16: la hora tiene precision de minutos
def test_reserva_crear_acepta_hora_con_segundos_en_cero() -> None:
    assert _reserva(hora="21:30:00").hora == time(21, 30)


@pytest.mark.parametrize("hora", ["21:30:45", "21:30:00.500000", "21:30+03:00", "21:30Z"])
def test_reserva_crear_rechaza_hora_con_segundos(hora: str) -> None:
    assert _campos_con_error(hora=hora) == {"hora"}


# CA 2 (S15): el estado y el id los asigna el sistema
@pytest.mark.parametrize("estado", ["ATENDIDA", "ACTIVA"])
def test_reserva_crear_rechaza_estado(estado: str) -> None:
    assert _campos_con_error(estado=estado) == {"estado"}


def test_reserva_crear_rechaza_id() -> None:
    assert _campos_con_error(id=1) == {"id"}


# Decision 7: la salida entrega la hora como HH:MM
def test_reserva_salida_serializa_hora_en_minutos() -> None:
    salida = ReservaSalida(
        id=1,
        mesa_id=5,
        cliente_id=7,
        fecha=date(2026, 11, 2),
        hora=time(21, 30),
        cantidad_personas=4,
        estado=EstadoReserva.ACTIVA,
    )

    assert salida.model_dump(mode="json") == {
        "id": 1,
        "mesa_id": 5,
        "cliente_id": 7,
        "fecha": "2026-11-02",
        "hora": "21:30",
        "cantidad_personas": 4,
        "estado": "ACTIVA",
    }
    assert '"hora":"21:30"' in salida.model_dump_json()


def test_reserva_salida_serializa_horas_con_cero_a_la_izquierda() -> None:
    salida = ReservaSalida(
        id=2,
        mesa_id=5,
        cliente_id=7,
        fecha=date(2026, 11, 2),
        hora=time(4, 5),
        cantidad_personas=1,
        estado=EstadoReserva.ATENDIDA,
    )

    assert salida.model_dump(mode="json")["hora"] == "04:05"
