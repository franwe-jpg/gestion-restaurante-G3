"""Pruebas del router de sectores (HU-M3-01)."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.salon.models import Sector

RUTA = "/api/v1/sectores"


def _cantidad_sectores(db: Session) -> int:
    return len(db.scalars(select(Sector)).all())


# CA 1, CA 5 y CA 6
def test_crear_sector_responde_201_con_la_forma_de_sector_salida(cliente: TestClient) -> None:
    respuesta = cliente.post(RUTA, json={"nombre": "  Salón principal  "})

    assert respuesta.status_code == 201
    assert respuesta.json() == {
        "id": 1,
        "nombre": "Salón principal",
        "descripcion": None,
        "estado": "HABILITADO",
    }


def test_crear_sector_con_descripcion_responde_201(cliente: TestClient) -> None:
    respuesta = cliente.post(RUTA, json={"nombre": "Terraza", "descripcion": "Al aire libre"})

    assert respuesta.status_code == 201
    assert respuesta.json()["descripcion"] == "Al aire libre"
    assert respuesta.json()["estado"] == "HABILITADO"


def test_crear_sector_con_30_caracteres_responde_201(cliente: TestClient) -> None:
    respuesta = cliente.post(RUTA, json={"nombre": "a" * 30})

    assert respuesta.status_code == 201


# CA 2, CA 5, CA 6 y descripcion
@pytest.mark.parametrize(
    "cuerpo, campo",
    [
        ({}, "nombre"),
        ({"nombre": ""}, "nombre"),
        ({"nombre": "   "}, "nombre"),
        ({"nombre": "a" * 31}, "nombre"),
        ({"nombre": "Terraza", "descripcion": "a" * 201}, "descripcion"),
        ({"nombre": "Terraza", "estado": "DESHABILITADO"}, "estado"),
    ],
    ids=["sin-nombre", "vacio", "solo-espacios", "31-caracteres", "descripcion-201", "estado"],
)
def test_crear_sector_con_datos_invalidos_responde_422_sin_guardar(
    cliente: TestClient, db: Session, cuerpo: dict, campo: str
) -> None:
    respuesta = cliente.post(RUTA, json=cuerpo)

    assert respuesta.status_code == 422
    assert campo in respuesta.json()["detalle"]
    assert _cantidad_sectores(db) == 0


# CA 3
def test_crear_sector_con_nombre_repetido_responde_409_con_detalle(cliente: TestClient) -> None:
    cliente.post(RUTA, json={"nombre": "Salón principal"})

    respuesta = cliente.post(RUTA, json={"nombre": "  salón PRINCIPAL "})

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": "El sector ya existe"}
    assert cliente.post(RUTA, json={"nombre": "Terraza"}).status_code == 201


# Preserva las rutas registradas antes de sumar el router del salon
def test_registrar_el_router_del_salon_conserva_las_rutas_existentes(
    cliente: TestClient,
) -> None:
    assert cliente.get("/api/v1/salud").json() == {"estado": "ok"}
    assert cliente.get("/api/v1/secciones").status_code == 200
