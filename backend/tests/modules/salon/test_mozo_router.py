"""Pruebas del router de mozos (HU-M3-09 a HU-M3-12)."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.salon.models import Mozo
from app.shared.models import Estado

RUTA = "/api/v1/mozos"


def _cantidad_mozos(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(Mozo)) or 0


def _cuerpo(**cambios) -> dict:
    return {
        "dni": "30123456",
        "nombre": "Juan",
        "apellido": "Fernández",
        "telefono": "280 412-3456",
    } | cambios


def _mozo_del_listado(cliente: TestClient, mozo_id: int) -> dict:
    items = cliente.get(RUTA).json()["items"]
    return next(mozo for mozo in items if mozo["id"] == mozo_id)


# CA 1 y CA 7 de #43
def test_crear_mozo_responde_201_con_la_forma_de_mozo_salida(cliente: TestClient) -> None:
    respuesta = cliente.post(RUTA, json=_cuerpo())

    assert respuesta.status_code == 201
    assert respuesta.json() == {
        "id": 1,
        "dni": "30123456",
        "nombre": "Juan",
        "apellido": "Fernández",
        "telefono": "280 412-3456",
        "estado": "HABILITADO",
    }


def test_crear_mozo_sin_telefono_responde_201(cliente: TestClient) -> None:
    respuesta = cliente.post(RUTA, json={"dni": "7123456", "nombre": "Ana", "apellido": "Romero"})

    assert respuesta.status_code == 201
    assert respuesta.json()["telefono"] is None
    assert respuesta.json()["estado"] == "HABILITADO"


# CA 2, CA 5, CA 6 y CA 7 de #43
@pytest.mark.parametrize(
    "cuerpo, campo",
    [
        ({}, "dni"),
        ({"dni": "30123456", "nombre": "Juan"}, "apellido"),
        ({"dni": "30123456", "apellido": "Fernández"}, "nombre"),
        (_cuerpo(dni=""), "dni"),
        (_cuerpo(dni="301234"), "dni"),
        (_cuerpo(dni="301234567"), "dni"),
        (_cuerpo(dni="3012345a"), "dni"),
        (_cuerpo(dni="30.123.456"), "dni"),
        (_cuerpo(nombre="Juan123"), "nombre"),
        (_cuerpo(nombre="Juan!"), "nombre"),
        (_cuerpo(nombre=""), "nombre"),
        (_cuerpo(apellido="Fernández2"), "apellido"),
        (_cuerpo(apellido=""), "apellido"),
        (_cuerpo(estado="DESHABILITADO"), "estado"),
    ],
    ids=[
        "sin-campos",
        "sin-apellido",
        "sin-nombre",
        "dni-vacio",
        "dni-seis-digitos",
        "dni-nueve-digitos",
        "dni-letra",
        "dni-con-puntos",
        "nombre-numeros",
        "nombre-especial",
        "nombre-vacio",
        "apellido-numeros",
        "apellido-vacio",
        "estado",
    ],
)
def test_crear_mozo_con_datos_invalidos_responde_422_sin_guardar(
    cliente: TestClient, db: Session, cuerpo: dict, campo: str
) -> None:
    respuesta = cliente.post(RUTA, json=cuerpo)

    assert respuesta.status_code == 422
    assert campo in respuesta.json()["detalle"]
    assert _cantidad_mozos(db) == 0


# CA 3 de #43
def test_crear_mozo_con_dni_repetido_responde_409(cliente: TestClient, fabrica_mozo) -> None:
    fabrica_mozo(dni="30123456")

    respuesta = cliente.post(RUTA, json=_cuerpo())

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": "Ya existe un mozo con el DNI 30123456"}


# CA 1, CA 3 y CA 4 de #45: listado
def test_listar_mozos_sin_filtro_devuelve_habilitados_y_deshabilitados(
    cliente: TestClient, fabrica_mozo
) -> None:
    fabrica_mozo(dni="30123456", nombre="Juan", apellido="Fernández")
    fabrica_mozo(
        dni="35987654",
        nombre="Ana",
        apellido="Romero",
        estado=Estado.DESHABILITADO,
    )

    respuesta = cliente.get(RUTA)

    assert respuesta.status_code == 200
    assert [
        (mozo["apellido"], mozo["nombre"], mozo["estado"]) for mozo in respuesta.json()["items"]
    ] == [
        ("Fernández", "Juan", "HABILITADO"),
        ("Romero", "Ana", "DESHABILITADO"),
    ]
    assert respuesta.json()["total"] == 2


def test_listar_mozos_sin_mozos_responde_pagina_vacia(cliente: TestClient) -> None:
    respuesta = cliente.get(RUTA)

    assert respuesta.status_code == 200
    assert respuesta.json() == {"items": [], "total": 0, "limit": 50, "offset": 0}


def test_listar_mozos_disponibles_solo_devuelve_habilitados(
    cliente: TestClient, fabrica_mozo
) -> None:
    fabrica_mozo(dni="30123456", nombre="Juan", apellido="Fernández")
    fabrica_mozo(
        dni="35987654",
        nombre="Ana",
        apellido="Romero",
        estado=Estado.DESHABILITADO,
    )

    respuesta = cliente.get(f"{RUTA}?estado=HABILITADO&limit=100&offset=0")

    assert respuesta.status_code == 200
    assert [mozo["nombre"] for mozo in respuesta.json()["items"]] == ["Juan"]
    assert respuesta.json()["total"] == 1


def test_listar_mozos_pagina_sin_cambiar_el_total(cliente: TestClient, fabrica_mozo) -> None:
    for indice, apellido in enumerate(["Castro", "Fernández", "Romero"], start=1):
        fabrica_mozo(dni=f"3012345{indice}", nombre="Mozo", apellido=apellido)

    respuesta = cliente.get(f"{RUTA}?limit=2&offset=2")

    assert [mozo["apellido"] for mozo in respuesta.json()["items"]] == ["Romero"]
    assert respuesta.json()["total"] == 3


@pytest.mark.parametrize(
    "consulta",
    ["limit=0", "limit=101", "offset=-1", "estado=ACTIVO"],
    ids=["limit-cero", "limit-101", "offset-negativo", "estado-invalido"],
)
def test_listar_mozos_con_parametros_invalidos_responde_422(
    cliente: TestClient, consulta: str
) -> None:
    respuesta = cliente.get(f"{RUTA}?{consulta}")

    assert respuesta.status_code == 422
    assert "detalle" in respuesta.json()


# CA 1 de #44
def test_modificar_mozo_responde_200_con_la_forma_de_mozo_salida(
    cliente: TestClient, fabrica_mozo
) -> None:
    mozo = fabrica_mozo()

    respuesta = cliente.put(
        f"{RUTA}/{mozo.id}",
        json={
            "dni": "35987654",
            "nombre": "Juan Carlos",
            "apellido": "Pérez",
            "telefono": "280 400-0000",
        },
    )

    assert respuesta.status_code == 200
    assert respuesta.json() == {
        "id": mozo.id,
        "dni": "35987654",
        "nombre": "Juan Carlos",
        "apellido": "Pérez",
        "telefono": "280 400-0000",
        "estado": "HABILITADO",
    }
    assert _mozo_del_listado(cliente, mozo.id) == respuesta.json()


def test_modificar_mozo_conserva_el_estado_deshabilitado(cliente: TestClient, fabrica_mozo) -> None:
    mozo = fabrica_mozo(estado=Estado.DESHABILITADO)

    respuesta = cliente.put(
        f"{RUTA}/{mozo.id}",
        json={"dni": "30123456", "nombre": "Juan", "apellido": "Gómez"},
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["apellido"] == "Gómez"
    assert respuesta.json()["estado"] == "DESHABILITADO"


def test_modificar_mozo_inexistente_responde_404(cliente: TestClient) -> None:
    respuesta = cliente.put(f"{RUTA}/99", json=_cuerpo())

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detalle": "El mozo 99 no existe"}


# CA 3 de #44
def test_modificar_mozo_con_dni_de_otro_responde_409_sin_cambios(
    cliente: TestClient, fabrica_mozo
) -> None:
    fabrica_mozo(dni="30123456", nombre="Ana", apellido="Romero")
    mozo = fabrica_mozo(dni="35987654")

    respuesta = cliente.put(f"{RUTA}/{mozo.id}", json=_cuerpo(dni="30123456"))

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": "Ya existe un mozo con el DNI 30123456"}
    assert _mozo_del_listado(cliente, mozo.id)["dni"] == "35987654"


# CA 2 de #44
@pytest.mark.parametrize(
    "cuerpo, campo",
    [
        (_cuerpo(nombre=""), "nombre"),
        (_cuerpo(apellido="Fernández2"), "apellido"),
        (_cuerpo(dni="301234"), "dni"),
        (_cuerpo(estado="DESHABILITADO"), "estado"),
    ],
    ids=["nombre-vacio", "apellido-numeros", "dni-corto", "estado"],
)
def test_modificar_mozo_con_datos_invalidos_responde_422_sin_guardar(
    cliente: TestClient, fabrica_mozo, cuerpo: dict, campo: str
) -> None:
    mozo = fabrica_mozo()

    respuesta = cliente.put(f"{RUTA}/{mozo.id}", json=cuerpo)

    assert respuesta.status_code == 422
    assert campo in respuesta.json()["detalle"]
    assert _mozo_del_listado(cliente, mozo.id)["nombre"] == "Juan"


def test_modificar_mozo_con_id_no_entero_responde_422(cliente: TestClient) -> None:
    respuesta = cliente.put(f"{RUTA}/abc", json=_cuerpo())

    assert respuesta.status_code == 422
    assert "detalle" in respuesta.json()


# CA 1 de #45
def test_dar_de_baja_mozo_responde_200_y_deja_de_estar_disponible(
    cliente: TestClient, fabrica_mozo
) -> None:
    mozo = fabrica_mozo()

    respuesta = cliente.post(f"{RUTA}/{mozo.id}/baja")

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "DESHABILITADO"
    assert cliente.get(f"{RUTA}?estado=HABILITADO").json()["total"] == 0
    assert _mozo_del_listado(cliente, mozo.id)["estado"] == "DESHABILITADO"


# CA 4 de #45
def test_dar_de_baja_mozo_ya_deshabilitado_responde_409(cliente: TestClient, fabrica_mozo) -> None:
    mozo = fabrica_mozo(estado=Estado.DESHABILITADO)

    respuesta = cliente.post(f"{RUTA}/{mozo.id}/baja")

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": "El mozo ya está dado de baja"}


def test_dar_de_baja_mozo_inexistente_responde_404(cliente: TestClient) -> None:
    respuesta = cliente.post(f"{RUTA}/999/baja")

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detalle": "El mozo 999 no existe"}


def test_dar_de_baja_mozo_con_id_no_entero_responde_422(cliente: TestClient) -> None:
    respuesta = cliente.post(f"{RUTA}/abc/baja")

    assert respuesta.status_code == 422
    assert "detalle" in respuesta.json()
