"""Pruebas del router de reservas (HU-M5-01, HU-M5-02 y HU-M5-03)."""

from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.reservas.models import Reserva
from app.shared.models.enums import EstadoMesa

RUTA = "/api/v1/reservas"
MANANA = (date.today() + timedelta(days=1)).isoformat()
AYER = (date.today() - timedelta(days=1)).isoformat()


def _cantidad_reservas(db: Session) -> int:
    return len(db.scalars(select(Reserva)).all())


def _cuerpo(mesa_id: int, fecha: str = MANANA, hora: str = "21:00", cantidad: int = 4) -> dict:
    return {
        "cliente_nombre": "Ana Pérez",
        "cliente_telefono": "2804000000",
        "fecha": fecha,
        "hora": hora,
        "cantidad_personas": cantidad,
        "mesa_id": mesa_id,
    }


# CA 1
def test_crear_reserva_responde_201_con_la_forma_de_reserva_salida(
    cliente: TestClient, fabrica_sector, fabrica_mesa
) -> None:
    mesa = fabrica_mesa(fabrica_sector("Terraza"), numero=5)

    respuesta = cliente.post(RUTA, json=_cuerpo(mesa.id))

    assert respuesta.status_code == 201
    cuerpo = respuesta.json()
    assert cuerpo["cliente_nombre"] == "Ana Pérez"
    assert cuerpo["mesa"] == {
        "id": mesa.id,
        "numero": 5,
        "capacidad": 4,
        "sector_nombre": "Terraza",
    }
    assert cuerpo["estado"] == "ACTIVA"


# CA 2, CA 5
@pytest.mark.parametrize(
    "cambios, campo, quitar",
    [
        ({}, "cliente_nombre", "cliente_nombre"),
        ({"cliente_nombre": ""}, "cliente_nombre", None),
        ({"cliente_nombre": "Ana123"}, "cliente_nombre", None),
        ({"cliente_telefono": ""}, "cliente_telefono", None),
        ({"cantidad_personas": 0}, "cantidad_personas", None),
        ({"cantidad_personas": -1}, "cantidad_personas", None),
        ({"mesa_id": 0}, "mesa_id", None),
        ({"estado": "ACTIVA"}, "estado", None),
    ],
    ids=[
        "sin-cliente",
        "cliente-vacio",
        "cliente-con-numeros",
        "telefono-vacio",
        "cantidad-cero",
        "cantidad-negativa",
        "mesa-cero",
        "estado",
    ],
)
def test_crear_reserva_con_datos_invalidos_responde_422_sin_guardar(
    cliente: TestClient,
    db: Session,
    fabrica_sector,
    fabrica_mesa,
    cambios: dict,
    campo: str,
    quitar: str | None,
) -> None:
    mesa = fabrica_mesa(fabrica_sector())
    cuerpo = _cuerpo(mesa.id) | cambios
    if quitar:
        del cuerpo[quitar]

    respuesta = cliente.post(RUTA, json=cuerpo)

    assert respuesta.status_code == 422
    assert campo in respuesta.json()["detalle"]
    assert _cantidad_reservas(db) == 0


def test_crear_reserva_con_mesa_inexistente_responde_404(cliente: TestClient, db: Session) -> None:
    respuesta = cliente.post(RUTA, json=_cuerpo(99))

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detalle": "La mesa 99 no existe"}
    assert _cantidad_reservas(db) == 0


# CA 4
def test_crear_reserva_con_fecha_pasada_responde_409(
    cliente: TestClient, db: Session, fabrica_sector, fabrica_mesa
) -> None:
    mesa = fabrica_mesa(fabrica_sector())

    respuesta = cliente.post(RUTA, json=_cuerpo(mesa.id, fecha=AYER))

    assert respuesta.status_code == 409
    assert _cantidad_reservas(db) == 0


# CA 7
def test_crear_reserva_con_mesa_fuera_de_servicio_responde_409(
    cliente: TestClient, db: Session, fabrica_sector, fabrica_mesa
) -> None:
    mesa = fabrica_mesa(fabrica_sector(), estado=EstadoMesa.FUERA_DE_SERVICIO)

    respuesta = cliente.post(RUTA, json=_cuerpo(mesa.id))

    assert respuesta.status_code == 409
    assert _cantidad_reservas(db) == 0


# CA 6
def test_crear_reserva_con_mesa_ya_reservada_responde_409(
    cliente: TestClient, db: Session, fabrica_sector, fabrica_mesa
) -> None:
    mesa = fabrica_mesa(fabrica_sector())
    cliente.post(RUTA, json=_cuerpo(mesa.id))

    respuesta = cliente.post(RUTA, json=_cuerpo(mesa.id))

    assert respuesta.status_code == 409
    assert _cantidad_reservas(db) == 1


# --- PUT /reservas/{id}: HU-M5-02 ---


def test_modificar_reserva_responde_200_con_los_datos_actualizados(
    cliente: TestClient, fabrica_sector, fabrica_mesa
) -> None:
    mesa = fabrica_mesa(fabrica_sector())
    creada = cliente.post(RUTA, json=_cuerpo(mesa.id)).json()

    respuesta = cliente.put(
        f"{RUTA}/{creada['id']}",
        json={"fecha": MANANA, "hora": "22:00", "cantidad_personas": 6},
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["hora"] == "22:00:00"
    assert respuesta.json()["cantidad_personas"] == 6


def test_modificar_reserva_inexistente_responde_404(cliente: TestClient) -> None:
    respuesta = cliente.put(
        f"{RUTA}/99", json={"fecha": MANANA, "hora": "22:00", "cantidad_personas": 2}
    )

    assert respuesta.status_code == 404


def test_modificar_reserva_a_horario_ocupado_responde_409_sin_aplicar_el_cambio(
    cliente: TestClient, fabrica_sector, fabrica_mesa
) -> None:
    mesa = fabrica_mesa(fabrica_sector())
    primera = cliente.post(RUTA, json=_cuerpo(mesa.id, hora="21:00")).json()
    cliente.post(RUTA, json=_cuerpo(mesa.id, hora="22:00"))

    respuesta = cliente.put(
        f"{RUTA}/{primera['id']}",
        json={"fecha": MANANA, "hora": "22:00", "cantidad_personas": 4},
    )

    assert respuesta.status_code == 409


# --- GET /reservas: HU-M5-03 ---


def test_listar_reservas_de_un_dia(cliente: TestClient, fabrica_sector, fabrica_mesa) -> None:
    mesa = fabrica_mesa(fabrica_sector())
    cliente.post(RUTA, json=_cuerpo(mesa.id, hora="20:00"))
    cliente.post(RUTA, json=_cuerpo(mesa.id, hora="21:00"))

    respuesta = cliente.get(f"{RUTA}?fecha={MANANA}")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert [item["hora"] for item in cuerpo["items"]] == ["20:00:00", "21:00:00"]
    assert cuerpo["total"] == 2


def test_listar_reservas_sin_reservas_ese_dia_devuelve_vacio(cliente: TestClient) -> None:
    respuesta = cliente.get(f"{RUTA}?fecha={MANANA}")

    assert respuesta.status_code == 200
    assert respuesta.json() == {"items": [], "total": 0, "limit": 50, "offset": 0}


def test_listar_reservas_sin_fecha_responde_422(cliente: TestClient) -> None:
    respuesta = cliente.get(RUTA)

    assert respuesta.status_code == 422


# --- GET /reservas/mesas-disponibles ---


def test_listar_mesas_disponibles_excluye_ocupadas_y_fuera_de_servicio(
    cliente: TestClient, fabrica_sector, fabrica_mesa
) -> None:
    sector = fabrica_sector()
    libre = fabrica_mesa(sector, numero=1)
    fabrica_mesa(sector, numero=2, estado=EstadoMesa.FUERA_DE_SERVICIO)
    reservada = fabrica_mesa(sector, numero=3)
    cliente.post(RUTA, json=_cuerpo(reservada.id, hora="21:00"))

    respuesta = cliente.get(f"{RUTA}/mesas-disponibles?fecha={MANANA}&hora=21:00")

    assert respuesta.status_code == 200
    ids = {mesa["id"] for mesa in respuesta.json()}
    assert ids == {libre.id}
