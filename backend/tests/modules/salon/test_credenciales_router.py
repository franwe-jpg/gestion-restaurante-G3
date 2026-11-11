"""Endpoints /chefs y /mozos con credenciales (HU-TR-01, 5.5)."""

import pytest
from fastapi.testclient import TestClient

RUTA_SESION = "/api/v1/sesion"


def _cuerpo(**cambios: object) -> dict[str, object]:
    return {
        "dni": "30123456",
        "nombre": "Luis",
        "apellido": "Gil",
        "telefono": "280 412-3456",
        "correo": "luis@resto.com",
        "contrasena": "Clave1234",
    } | cambios


def test_crear_chef_responde_201_con_correo_y_sin_contrasena(cliente: TestClient) -> None:
    respuesta = cliente.post("/api/v1/chefs", json=_cuerpo())

    assert respuesta.status_code == 201
    assert respuesta.json() == {
        "id": 1,
        "dni": "30123456",
        "nombre": "Luis",
        "apellido": "Gil",
        "telefono": "280 412-3456",
        "estado": "HABILITADO",
        "correo": "luis@resto.com",
    }


def test_el_chef_creado_inicia_sesion_con_su_rol_nombre_y_apellido(cliente: TestClient) -> None:
    cliente.post("/api/v1/chefs", json=_cuerpo())

    respuesta = cliente.post(
        RUTA_SESION, json={"correo": "luis@resto.com", "contrasena": "Clave1234"}
    )

    assert respuesta.status_code == 201
    usuario = respuesta.json()["usuario"]
    assert usuario["roles"] == ["CHEF"]
    assert (usuario["nombre"], usuario["apellido"]) == ("Luis", "Gil")


def test_el_mozo_creado_inicia_sesion_con_su_rol_nombre_y_apellido(cliente: TestClient) -> None:
    respuesta = cliente.post("/api/v1/mozos", json=_cuerpo(nombre="Ana", apellido="Paz"))
    assert respuesta.json()["correo"] == "luis@resto.com"

    inicio = cliente.post(RUTA_SESION, json={"correo": "luis@resto.com", "contrasena": "Clave1234"})

    usuario = inicio.json()["usuario"]
    assert usuario["roles"] == ["MOZO"]
    assert (usuario["nombre"], usuario["apellido"]) == ("Ana", "Paz")


@pytest.mark.parametrize("ruta", ["/api/v1/chefs", "/api/v1/mozos"])
@pytest.mark.parametrize(
    "cambio",
    [
        {"correo": ""},
        {"correo": "sin-arroba"},
        {"contrasena": "1234567"},
        {"contrasena": "a" * 73},
        {"estado": "HABILITADO"},
    ],
)
def test_alta_con_datos_invalidos_responde_422(
    cliente: TestClient, ruta: str, cambio: dict[str, str]
) -> None:
    assert cliente.post(ruta, json=_cuerpo(**cambio)).status_code == 422


@pytest.mark.parametrize("ruta", ["/api/v1/chefs", "/api/v1/mozos"])
def test_alta_con_correo_o_dni_repetido_responde_409(cliente: TestClient, ruta: str) -> None:
    cliente.post(ruta, json=_cuerpo())

    por_correo = cliente.post(ruta, json=_cuerpo(dni="30999999", correo=" LUIS@resto.com "))
    por_dni = cliente.post(ruta, json=_cuerpo(correo="otro@resto.com"))

    assert por_correo.status_code == 409
    assert por_correo.json() == {"detalle": "Ya existe un usuario con el correo luis@resto.com"}
    assert por_dni.status_code == 409


def test_listar_chefs_pagina_filtra_por_estado_y_valida_el_limite(cliente: TestClient) -> None:
    for numero in range(3):
        cliente.post(
            "/api/v1/chefs", json=_cuerpo(dni=f"3000000{numero}", correo=f"c{numero}@resto.com")
        )
    cliente.post("/api/v1/chefs/1/baja")

    pagina = cliente.get("/api/v1/chefs", params={"limit": 2}).json()
    deshabilitados = cliente.get("/api/v1/chefs", params={"estado": "DESHABILITADO"}).json()

    assert (len(pagina["items"]), pagina["total"]) == (2, 3)
    assert [chef["id"] for chef in deshabilitados["items"]] == [1]
    assert cliente.get("/api/v1/chefs", params={"limit": 101}).status_code == 422
    assert all("contrasena" not in chef for chef in pagina["items"])


def test_modificar_chef_responde_200_y_404_si_no_existe(cliente: TestClient) -> None:
    cliente.post("/api/v1/chefs", json=_cuerpo())
    cuerpo = _cuerpo(telefono="123", contrasena="")

    modificado = cliente.put("/api/v1/chefs/1", json=cuerpo)
    inexistente = cliente.put("/api/v1/chefs/999", json=cuerpo)

    assert modificado.status_code == 200
    assert modificado.json()["telefono"] == "123"
    assert inexistente.status_code == 404
    assert inexistente.json() == {"detalle": "El chef 999 no existe"}


def test_baja_de_chef_responde_200_y_409_si_se_repite(cliente: TestClient) -> None:
    cliente.post("/api/v1/chefs", json=_cuerpo())

    primera = cliente.post("/api/v1/chefs/1/baja")
    repetida = cliente.post("/api/v1/chefs/1/baja")
    inicio = cliente.post(RUTA_SESION, json={"correo": "luis@resto.com", "contrasena": "Clave1234"})

    assert primera.json()["estado"] == "DESHABILITADO"
    assert repetida.status_code == 409
    assert repetida.json() == {"detalle": "El chef ya está dado de baja"}
    assert inicio.status_code == 401
