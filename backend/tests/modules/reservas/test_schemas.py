"""Pruebas de los esquemas de reservas (HU-M5-01, HU-M5-02 y HU-M5-03)."""

from datetime import date, time

import pytest
from pydantic import ValidationError

from app.modules.reservas.models import EstadoReserva
from app.modules.reservas.schemas import (
    FiltroReservas,
    ReservaCrear,
    ReservaModificar,
    ReservaSalida,
)

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


# HU-M5-03 CA 2: filtros por fecha y estado
def test_filtro_reservas_acepta_fecha_y_estado() -> None:
    filtro = FiltroReservas.model_validate({"fecha": "2026-11-02", "estado": "ACTIVA"})

    assert filtro.fecha == date(2026, 11, 2)
    assert filtro.estado == EstadoReserva.ACTIVA


def test_filtro_reservas_sin_parametros_usa_los_valores_por_defecto() -> None:
    filtro = FiltroReservas()

    assert (filtro.fecha, filtro.estado) == (None, None)
    assert (filtro.limit, filtro.offset) == (50, 0)


# S22: el estado distingue mayusculas y minusculas
@pytest.mark.parametrize("estado", ["ABIERTA", "activa"])
def test_filtro_reservas_rechaza_estado_desconocido(estado: str) -> None:
    with pytest.raises(ValidationError) as error:
        FiltroReservas.model_validate({"estado": estado})

    assert [str(falla["loc"][0]) for falla in error.value.errors()] == ["estado"]


@pytest.mark.parametrize("fecha", ["02/11/2026", "2026-13-40"])
def test_filtro_reservas_rechaza_fecha_invalida(fecha: str) -> None:
    with pytest.raises(ValidationError) as error:
        FiltroReservas.model_validate({"fecha": fecha})

    assert [str(falla["loc"][0]) for falla in error.value.errors()] == ["fecha"]


# HU-M5-03 CA 1: el filtro hereda los limites de ParametrosPaginacion (D-27)
@pytest.mark.parametrize(
    ("parametros", "campo"),
    [({"limit": 0}, "limit"), ({"limit": 101}, "limit"), ({"offset": -1}, "offset")],
)
def test_filtro_reservas_hereda_limites_de_paginacion(parametros: dict, campo: str) -> None:
    with pytest.raises(ValidationError) as error:
        FiltroReservas.model_validate(parametros)

    assert [str(falla["loc"][0]) for falla in error.value.errors()] == [campo]


# HU-M5-02: la modificacion solo trae fecha, hora y cantidad de personas
CUERPO_MODIFICAR = {"fecha": "2026-11-03", "hora": "22:00", "cantidad_personas": 5}


def _campos_con_error_al_modificar(cuerpo: dict) -> set[str]:
    with pytest.raises(ValidationError) as error:
        ReservaModificar.model_validate(cuerpo)
    return {str(falla["loc"][0]) for falla in error.value.errors()}


def test_reserva_modificar_acepta_fecha_hora_y_personas() -> None:
    datos = ReservaModificar.model_validate(CUERPO_MODIFICAR)

    assert datos.fecha == date(2026, 11, 3)
    assert datos.hora == time(22, 0)
    assert datos.cantidad_personas == 5


# S19: el PUT exige los tres campos
@pytest.mark.parametrize("campo", list(CUERPO_MODIFICAR))
def test_reserva_modificar_exige_los_tres_campos(campo: str) -> None:
    cuerpo = {nombre: valor for nombre, valor in CUERPO_MODIFICAR.items() if nombre != campo}

    assert _campos_con_error_al_modificar(cuerpo) == {campo}


# CA 2 (S15): mesa, cliente, estado e id no se reciben
@pytest.mark.parametrize(
    ("campo", "valor"),
    [("mesa_id", 6), ("cliente_id", 8), ("estado", "ATENDIDA"), ("id", 1)],
)
def test_reserva_modificar_rechaza_mesa_cliente_estado_o_id(campo: str, valor: object) -> None:
    assert _campos_con_error_al_modificar(CUERPO_MODIFICAR | {campo: valor}) == {campo}


# La modificacion hereda las reglas de cantidad y de hora del alta
@pytest.mark.parametrize(
    ("campo", "valor"),
    [
        ("cantidad_personas", 0),
        ("cantidad_personas", "4"),
        ("cantidad_personas", True),
        ("hora", "21:30:45"),
    ],
)
def test_reserva_modificar_hereda_reglas_de_cantidad_y_hora(campo: str, valor: object) -> None:
    assert _campos_con_error_al_modificar(CUERPO_MODIFICAR | {campo: valor}) == {campo}
