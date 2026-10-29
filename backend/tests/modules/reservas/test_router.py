"""Pruebas del router de reservas: alta (HU-M5-01) y listado (HU-M5-03)."""

from datetime import date, time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.reservas.models import EstadoReserva, Reserva

RUTA = "/api/v1/reservas"
# El reloj de las pruebas (conftest.py) marca el 2026-11-02 a las 12:00.
CUERPO = {
    "mesa_id": 5,
    "cliente_id": 7,
    "fecha": "2026-11-02",
    "hora": "21:30",
    "cantidad_personas": 4,
}
TURNO_OCUPADO = "La mesa 5 ya tiene una reserva activa el 2026-11-02 a las 21:30"


def _cantidad_reservas(db: Session) -> int:
    return len(db.scalars(select(Reserva)).all())


# HU-M5-01 CA 1 y CA 2
def test_post_reservas_crea_y_devuelve_201(cliente: TestClient, db: Session) -> None:
    respuesta = cliente.post(RUTA, json=CUERPO)

    assert respuesta.status_code == 201
    assert respuesta.json() == {
        "id": 1,
        "mesa_id": 5,
        "cliente_id": 7,
        "fecha": "2026-11-02",
        "hora": "21:30",
        "cantidad_personas": 4,
        "estado": "ACTIVA",
    }
    guardada = db.get(Reserva, 1)
    assert guardada.hora == time(21, 30)
    assert guardada.fecha == date(2026, 11, 2)
    assert _cantidad_reservas(db) == 1


# CA 6, limite
def test_post_reservas_alta_para_hoy_con_hora_posterior_devuelve_201(cliente: TestClient) -> None:
    respuesta = cliente.post(RUTA, json=CUERPO | {"hora": "12:01"})

    assert respuesta.status_code == 201
    assert respuesta.json()["hora"] == "12:01"


# CA 9
def test_post_reservas_turno_ocupado_devuelve_409_con_detalle(
    cliente: TestClient, db: Session, fabrica_reserva
) -> None:
    fabrica_reserva(mesa_id=5, fecha=date(2026, 11, 2), hora=time(21, 30))

    respuesta = cliente.post(RUTA, json=CUERPO | {"cliente_id": 8})

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": TURNO_OCUPADO}
    assert _cantidad_reservas(db) == 1


# CA 5
def test_post_reservas_fecha_pasada_devuelve_422(cliente: TestClient, db: Session) -> None:
    respuesta = cliente.post(RUTA, json=CUERPO | {"fecha": "2026-11-01"})

    assert respuesta.status_code == 422
    assert respuesta.json() == {"detalle": "La fecha de la reserva no puede ser anterior a hoy"}
    assert _cantidad_reservas(db) == 0


# CA 6, limite
def test_post_reservas_hora_pasada_hoy_devuelve_422(cliente: TestClient, db: Session) -> None:
    respuesta = cliente.post(RUTA, json=CUERPO | {"hora": "12:00"})

    assert respuesta.status_code == 422
    assert respuesta.json() == {
        "detalle": "La hora de la reserva debe ser posterior a la hora actual"
    }
    assert _cantidad_reservas(db) == 0


# CA 4
def test_post_reservas_mesa_inexistente_devuelve_404(
    cliente: TestClient, db: Session, puente_sin_mesa
) -> None:
    respuesta = cliente.post(RUTA, json=CUERPO | {"mesa_id": 99})

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detalle": "La mesa 99 no existe"}
    assert _cantidad_reservas(db) == 0


def test_post_reservas_cliente_inexistente_devuelve_404(
    cliente: TestClient, db: Session, puente_sin_cliente
) -> None:
    respuesta = cliente.post(RUTA, json=CUERPO | {"cliente_id": 99})

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detalle": "El cliente 99 no existe"}
    assert _cantidad_reservas(db) == 0


# CA 3, CA 7 y formatos: el detalle nombra el campo y no se crea nada
@pytest.mark.parametrize(
    "cuerpo, campo",
    [
        ({k: v for k, v in CUERPO.items() if k != "mesa_id"}, "mesa_id"),
        ({k: v for k, v in CUERPO.items() if k != "cliente_id"}, "cliente_id"),
        ({k: v for k, v in CUERPO.items() if k != "fecha"}, "fecha"),
        ({k: v for k, v in CUERPO.items() if k != "hora"}, "hora"),
        ({k: v for k, v in CUERPO.items() if k != "cantidad_personas"}, "cantidad_personas"),
        (CUERPO | {"cantidad_personas": 0}, "cantidad_personas"),
        (CUERPO | {"mesa_id": 0}, "mesa_id"),
        (CUERPO | {"fecha": "02/11/2026"}, "fecha"),
        (CUERPO | {"hora": "25:00"}, "hora"),
        (CUERPO | {"hora": "21:30:45"}, "hora"),
    ],
    ids=[
        "sin-mesa",
        "sin-cliente",
        "sin-fecha",
        "sin-hora",
        "sin-cantidad",
        "cantidad-cero",
        "mesa-cero",
        "fecha-mal-formada",
        "hora-mal-formada",
        "hora-con-segundos",
    ],
)
def test_post_reservas_datos_invalidos_devuelve_422(
    cliente: TestClient, db: Session, cuerpo: dict, campo: str
) -> None:
    respuesta = cliente.post(RUTA, json=cuerpo)

    assert respuesta.status_code == 422
    assert campo in respuesta.json()["detalle"]
    assert _cantidad_reservas(db) == 0


# CA 2
def test_post_reservas_con_estado_en_el_cuerpo_devuelve_422(
    cliente: TestClient, db: Session
) -> None:
    respuesta = cliente.post(RUTA, json=CUERPO | {"estado": "ATENDIDA"})

    assert respuesta.status_code == 422
    assert "estado" in respuesta.json()["detalle"]
    assert _cantidad_reservas(db) == 0


# CA 8
def test_post_reservas_capacidad_excedida_devuelve_422(
    cliente: TestClient, db: Session, puente_con_capacidad
) -> None:
    puente_con_capacidad(6)

    respuesta = cliente.post(RUTA, json=CUERPO | {"cantidad_personas": 7})

    assert respuesta.status_code == 422
    assert respuesta.json() == {
        "detalle": "La mesa 5 tiene capacidad para 6 personas y la reserva pide 7"
    }
    assert _cantidad_reservas(db) == 0


# D-25 y D-26
def test_post_reservas_errores_tienen_solo_la_clave_detalle(
    cliente: TestClient, fabrica_reserva
) -> None:
    fabrica_reserva(mesa_id=5, fecha=date(2026, 11, 2), hora=time(21, 30))

    conflicto = cliente.post(RUTA, json=CUERPO)
    invalida = cliente.post(RUTA, json=CUERPO | {"cantidad_personas": 0})

    assert conflicto.status_code == 409
    assert invalida.status_code == 422
    for respuesta in (conflicto, invalida):
        cuerpo = respuesta.json()
        assert list(cuerpo) == ["detalle"]
        assert isinstance(cuerpo["detalle"], str)
        assert cuerpo["detalle"]


def test_post_reservas_error_404_tiene_solo_la_clave_detalle(
    cliente: TestClient, puente_sin_mesa
) -> None:
    respuesta = cliente.post(RUTA, json=CUERPO)

    assert respuesta.status_code == 404
    assert list(respuesta.json()) == ["detalle"]
    assert respuesta.json()["detalle"] == "La mesa 5 no existe"


# HU-M5-03: listado paginado
def _ids(respuesta) -> list[int]:
    return [reserva["id"] for reserva in respuesta.json()["items"]]


# CA 1 y CA 2
def test_get_reservas_pagina_y_filtra(cliente: TestClient, fabrica_reserva) -> None:
    hoy, manana = date(2026, 11, 2), date(2026, 11, 3)
    for mesa_id in (1, 2, 3):
        fabrica_reserva(mesa_id=mesa_id, fecha=hoy)
    fabrica_reserva(mesa_id=4, fecha=hoy, estado=EstadoReserva.ATENDIDA)
    fabrica_reserva(mesa_id=5, fecha=manana)
    filtros = "fecha=2026-11-02&estado=ACTIVA&limit=2"

    primera = cliente.get(f"{RUTA}?{filtros}&offset=0")
    segunda = cliente.get(f"{RUTA}?{filtros}&offset=2")

    assert primera.status_code == segunda.status_code == 200
    assert (_ids(primera), primera.json()["total"]) == ([1, 2], 3)
    assert (_ids(segunda), segunda.json()["total"]) == ([3], 3)
    assert (segunda.json()["limit"], segunda.json()["offset"]) == (2, 2)


def test_get_reservas_valores_por_defecto(cliente: TestClient, fabrica_reserva) -> None:
    for mesa_id in range(1, 61):
        fabrica_reserva(mesa_id=mesa_id)

    cuerpo = cliente.get(RUTA).json()

    assert (cuerpo["limit"], cuerpo["offset"], cuerpo["total"]) == (50, 0, 60)
    assert len(cuerpo["items"]) == 50


@pytest.mark.parametrize(
    ("consulta", "campo"),
    [
        ("limit=101", "limit"),
        ("limit=0", "limit"),
        ("offset=-1", "offset"),
        ("offset=abc", "offset"),
    ],
)
def test_get_reservas_limit_fuera_de_rango_devuelve_422(
    cliente: TestClient, consulta: str, campo: str
) -> None:
    respuesta = cliente.get(f"{RUTA}?{consulta}")

    assert respuesta.status_code == 422
    assert list(respuesta.json()) == ["detalle"]
    assert campo in respuesta.json()["detalle"]


@pytest.mark.parametrize(
    ("consulta", "campo"),
    [
        ("estado=ABIERTA", "estado"),
        ("estado=activa", "estado"),
        ("fecha=02/11/2026", "fecha"),
        ("fecha=2026-13-40", "fecha"),
    ],
)
def test_get_reservas_estado_o_fecha_invalidos_devuelve_422(
    cliente: TestClient, consulta: str, campo: str
) -> None:
    respuesta = cliente.get(f"{RUTA}?{consulta}")

    assert respuesta.status_code == 422
    assert list(respuesta.json()) == ["detalle"]
    assert campo in respuesta.json()["detalle"]


# CA 4
def test_get_reservas_sin_resultados_devuelve_200_vacio(cliente: TestClient) -> None:
    respuesta = cliente.get(RUTA)

    assert respuesta.status_code == 200
    assert respuesta.json() == {"items": [], "total": 0, "limit": 50, "offset": 0}


# CA 2: el filtro por fecha acepta cualquier dia, tambien pasado (S22)
def test_get_reservas_filtra_por_fecha_pasada(cliente: TestClient, fabrica_reserva) -> None:
    fabrica_reserva(mesa_id=1, fecha=date(2026, 10, 20), estado=EstadoReserva.ATENDIDA)
    fabrica_reserva(mesa_id=2, fecha=date(2026, 11, 2))

    respuesta = cliente.get(f"{RUTA}?fecha=2026-10-20")

    assert respuesta.status_code == 200
    assert (_ids(respuesta), respuesta.json()["total"]) == ([1], 1)
    assert respuesta.json()["items"][0]["estado"] == "ATENDIDA"


# Decision 7
def test_get_reservas_serializa_hora_en_minutos(cliente: TestClient, fabrica_reserva) -> None:
    fabrica_reserva(hora=time(4, 5))

    respuesta = cliente.get(RUTA)

    assert [reserva["hora"] for reserva in respuesta.json()["items"]] == ["04:05"]
