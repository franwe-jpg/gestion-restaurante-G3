"""Contrato HTTP de M4 con router local y aplicación principal."""

from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.database import get_db
from app.main import app as app_principal
from app.modules.atencion.models import Cliente
from app.modules.atencion.router import router

RUTA = "/api/v1/clientes"


@pytest.fixture
def cliente_m4(db: Session) -> Iterator[TestClient]:
    app = FastAPI()
    app.exception_handlers.update(app_principal.exception_handlers)
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as cliente:
        yield cliente


def guardar(db: Session, nombre: str = "Ana", telefono: str = "123") -> Cliente:
    registro = Cliente(nombre=nombre, telefono=telefono)
    db.add(registro)
    db.commit()
    return registro


def test_app_principal_registra_get_put_sin_alta_ni_baja(db: Session) -> None:
    registro = guardar(db)
    app_principal.dependency_overrides[get_db] = lambda: db
    try:
        with TestClient(app_principal) as cliente:
            listado = cliente.get(RUTA)
            edicion = cliente.put(
                f"{RUTA}/{registro.id}", json={"nombre": "María", "telefono": "+54 456-789"}
            )
            consulta = cliente.get(RUTA)
            alta = cliente.post(RUTA, json={"nombre": "Luis", "telefono": "789"})
            baja = cliente.delete(f"{RUTA}/{registro.id}")
    finally:
        app_principal.dependency_overrides.pop(get_db, None)

    assert listado.status_code == 200
    assert listado.json()["items"] == [{"id": registro.id, "nombre": "Ana", "telefono": "123"}]
    assert edicion.status_code == 200
    assert edicion.json() == {"id": registro.id, "nombre": "María", "telefono": "+54 456-789"}
    assert consulta.json()["items"] == [edicion.json()]
    assert alta.status_code == 405
    assert baja.status_code == 405


def test_modificar_cliente_devuelve_200_y_consulta_posterior(
    cliente_m4: TestClient, db: Session
) -> None:
    registro = guardar(db)

    respuesta = cliente_m4.put(
        f"{RUTA}/{registro.id}", json={"nombre": "María", "telefono": "+54 456-789"}
    )

    assert respuesta.status_code == 200
    assert respuesta.json() == {"id": registro.id, "nombre": "María", "telefono": "+54 456-789"}
    consulta = cliente_m4.get(RUTA)
    assert consulta.status_code == 200, consulta.json()
    assert consulta.json()["items"] == [respuesta.json()]


def test_modificar_cliente_inexistente_devuelve_404(cliente_m4: TestClient) -> None:
    respuesta = cliente_m4.put(f"{RUTA}/99", json={"nombre": "Ana", "telefono": "123"})

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detalle": "El cliente 99 no existe"}


@pytest.mark.parametrize(
    "cuerpo,campo",
    [
        ({"nombre": "Ana2", "telefono": "456"}, "nombre"),
        ({"nombre": "Ana!", "telefono": "456"}, "nombre"),
        ({"nombre": "Ana", "telefono": "12a3"}, "telefono"),
        ({"nombre": "Ana", "telefono": "12+34"}, "telefono"),
        ({"nombre": "", "telefono": "456"}, "nombre"),
        ({"nombre": "Ana", "telefono": ""}, "telefono"),
        ({"telefono": "456"}, "nombre"),
        ({"nombre": "Ana"}, "telefono"),
    ],
)
def test_modificar_cliente_invalido_devuelve_422_y_conserva_ambos_datos(
    cliente_m4: TestClient, db: Session, cuerpo: dict, campo: str
) -> None:
    registro = guardar(db)

    respuesta = cliente_m4.put(f"{RUTA}/{registro.id}", json=cuerpo)
    db.expire_all()

    assert respuesta.status_code == 422
    assert campo in respuesta.json()["detalle"]
    assert (db.get(Cliente, registro.id).nombre, db.get(Cliente, registro.id).telefono) == (
        "Ana",
        "123",
    )


def test_listar_clientes_pagina_con_contacto_y_total(cliente_m4: TestClient, db: Session) -> None:
    guardar(db, "Ana", "123")
    guardar(db, "Luis", "456")

    respuesta = cliente_m4.get(f"{RUTA}?limit=1&offset=1")

    assert respuesta.status_code == 200
    assert respuesta.json() == {
        "items": [{"id": 2, "nombre": "Luis", "telefono": "456"}],
        "total": 2,
        "limit": 1,
        "offset": 1,
    }


@pytest.mark.parametrize(
    "q,esperados",
    [("Ana", ["Ana", "Anabel"]), ("nabel", ["Anabel"]), ("123", ["Ana", "Anabel"]), ("nadie", [])],
)
def test_listar_clientes_busca_nombre_o_telefono(
    cliente_m4: TestClient, db: Session, q: str, esperados: list[str]
) -> None:
    guardar(db, "Ana", "123")
    guardar(db, "Anabel", "123")
    guardar(db, "Luis", "456")

    respuesta = cliente_m4.get(RUTA, params={"q": q})

    assert respuesta.status_code == 200
    assert [item["nombre"] for item in respuesta.json()["items"]] == esperados
    assert respuesta.json()["total"] == len(esperados)


def test_listar_clientes_registro_vacio(cliente_m4: TestClient) -> None:
    respuesta = cliente_m4.get(RUTA)

    assert respuesta.status_code == 200
    assert respuesta.json() == {"items": [], "total": 0, "limit": 50, "offset": 0}


@pytest.mark.parametrize("params", [{"limit": 0}, {"limit": 101}, {"offset": -1}])
def test_listar_clientes_paginacion_invalida(cliente_m4: TestClient, params: dict) -> None:
    respuesta = cliente_m4.get(RUTA, params=params)

    assert respuesta.status_code == 422
    assert list(params)[0] in respuesta.json()["detalle"]
