"""Pruebas de los esquemas de reserva (HU-M5-01 y HU-M5-02)."""

import pytest
from pydantic import ValidationError

from app.modules.reservas.models import EstadoReserva
from app.modules.reservas.schemas import (
    MesaResumen,
    ReservaCrear,
    ReservaModificar,
    ReservaSalida,
)

DATOS_VALIDOS = {
    "cliente_nombre": "Ana Pérez",
    "cliente_telefono": "2804000000",
    "fecha": "2026-12-01",
    "hora": "21:00",
    "cantidad_personas": 4,
    "mesa_id": 1,
}


def _reserva(**cambios) -> ReservaCrear:
    return ReservaCrear.model_validate(DATOS_VALIDOS | cambios)


def _campos_con_error(**cambios) -> set[str]:
    with pytest.raises(ValidationError) as error:
        _reserva(**cambios)
    return {str(falla["loc"][0]) for falla in error.value.errors()}


# CA 1
def test_alta_acepta_datos_validos() -> None:
    datos = _reserva()

    assert datos.cliente_nombre == "Ana Pérez"
    assert datos.cliente_telefono == "2804000000"
    assert str(datos.fecha) == "2026-12-01"
    assert str(datos.hora) == "21:00:00"
    assert datos.cantidad_personas == 4
    assert datos.mesa_id == 1


# CA 2: todos los campos son obligatorios
@pytest.mark.parametrize("campo", list(DATOS_VALIDOS))
def test_alta_exige_todos_los_campos(campo: str) -> None:
    cuerpo = dict(DATOS_VALIDOS)
    del cuerpo[campo]

    with pytest.raises(ValidationError) as error:
        ReservaCrear.model_validate(cuerpo)

    assert {str(falla["loc"][0]) for falla in error.value.errors()} == {campo}


@pytest.mark.parametrize("nombre", ["", "   ", "Ana123"], ids=["vacio", "solo-espacios", "numeros"])
def test_cliente_nombre_invalido(nombre: str) -> None:
    assert _campos_con_error(cliente_nombre=nombre) == {"cliente_nombre"}


def test_cliente_nombre_se_recorta() -> None:
    assert _reserva(cliente_nombre="  Ana Pérez  ").cliente_nombre == "Ana Pérez"


def test_cliente_telefono_vacio_es_invalido() -> None:
    assert _campos_con_error(cliente_telefono="   ") == {"cliente_telefono"}


# CA 5: cantidad de personas mayor a cero y entera
@pytest.mark.parametrize(
    "valor",
    [0, -1, "4", 2.5, True],
    ids=["cero", "negativo", "texto", "decimal", "booleano"],
)
def test_cantidad_personas_invalida(valor: object) -> None:
    assert _campos_con_error(cantidad_personas=valor) == {"cantidad_personas"}


@pytest.mark.parametrize("valor", [0, -1, "1", 1.0, True])
def test_mesa_id_invalido(valor: object) -> None:
    assert _campos_con_error(mesa_id=valor) == {"mesa_id"}


# CA: el estado lo asigna el sistema
@pytest.mark.parametrize("campo, valor", [("estado", "ACTIVA"), ("id", 1)])
def test_alta_rechaza_campos_desconocidos(campo: str, valor: object) -> None:
    assert _campos_con_error(**{campo: valor}) == {campo}


def test_reserva_salida_anida_la_mesa_y_el_estado() -> None:
    salida = ReservaSalida(
        id=1,
        cliente_nombre="Ana Pérez",
        cliente_telefono="2804000000",
        fecha="2026-12-01",
        hora="21:00",
        cantidad_personas=4,
        mesa=MesaResumen(id=2, numero=5, capacidad=4, sector_nombre="Terraza"),
        estado=EstadoReserva.ACTIVA,
    )

    assert salida.model_dump(mode="json") == {
        "id": 1,
        "cliente_nombre": "Ana Pérez",
        "cliente_telefono": "2804000000",
        "fecha": "2026-12-01",
        "hora": "21:00:00",
        "cantidad_personas": 4,
        "mesa": {"id": 2, "numero": 5, "capacidad": 4, "sector_nombre": "Terraza"},
        "estado": "ACTIVA",
    }


# --- HU-M5-02: esquema de modificacion ---

DATOS_MODIFICAR = {"fecha": "2026-12-02", "hora": "22:00", "cantidad_personas": 6}


def test_modificar_acepta_fecha_hora_y_comensales() -> None:
    datos = ReservaModificar.model_validate(DATOS_MODIFICAR)

    assert str(datos.fecha) == "2026-12-02"
    assert datos.cantidad_personas == 6


@pytest.mark.parametrize("campo, valor", [("mesa_id", 1), ("cliente_nombre", "Ana")])
def test_modificar_rechaza_mesa_y_cliente(campo: str, valor: object) -> None:
    with pytest.raises(ValidationError) as error:
        ReservaModificar.model_validate(DATOS_MODIFICAR | {campo: valor})

    assert {str(falla["loc"][0]) for falla in error.value.errors()} == {campo}


@pytest.mark.parametrize("valor", [0, -1])
def test_modificar_rechaza_cantidad_de_personas_no_positiva(valor: int) -> None:
    with pytest.raises(ValidationError) as error:
        ReservaModificar.model_validate(DATOS_MODIFICAR | {"cantidad_personas": valor})

    assert {str(falla["loc"][0]) for falla in error.value.errors()} == {"cantidad_personas"}
