import pytest
from fastapi.testclient import TestClient

from app.shared.models import Estado

RUTA = "/api/v1/secciones"


# CA 1
def test_crear_seccion_responde_201_con_la_forma_s5(cliente: TestClient) -> None:
    respuesta = cliente.post(RUTA, json={"nombre": "Entradas", "orden": 1})

    assert respuesta.status_code == 201
    assert respuesta.json() == {
        "id": 1,
        "nombre": "Entradas",
        "orden": 1,
        "estado": "HABILITADO",
        "productos": [],
    }


def test_crear_seccion_ignora_el_estado_enviado(cliente: TestClient) -> None:
    respuesta = cliente.post(
        RUTA, json={"nombre": "Entradas", "orden": 1, "estado": "DESHABILITADO"}
    )

    assert respuesta.status_code == 201
    assert respuesta.json()["estado"] == "HABILITADO"


# CA 2
@pytest.mark.parametrize(
    "cuerpo, campo",
    [
        ({"orden": 1}, "nombre"),
        ({"nombre": "Entradas"}, "orden"),
        ({"nombre": "   ", "orden": 1}, "nombre"),
    ],
)
def test_crear_seccion_sin_campos_obligatorios_responde_422(
    cliente: TestClient, cuerpo: dict, campo: str
) -> None:
    respuesta = cliente.post(RUTA, json=cuerpo)

    assert respuesta.status_code == 422
    assert campo in respuesta.json()["detalle"]
    assert cliente.get(RUTA).json()["total"] == 0


# CA 3
def test_crear_seccion_con_nombre_repetido_responde_409(cliente: TestClient) -> None:
    cliente.post(RUTA, json={"nombre": "Postres", "orden": 1})

    respuesta = cliente.post(RUTA, json={"nombre": "  postres ", "orden": 2})

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": "La sección ya existe"}


# CA 4
def test_crear_seccion_con_51_caracteres_responde_422(cliente: TestClient) -> None:
    respuesta = cliente.post(RUTA, json={"nombre": "a" * 51, "orden": 1})

    assert respuesta.status_code == 422
    assert "nombre" in respuesta.json()["detalle"]


def test_crear_seccion_con_50_caracteres_y_numeros_responde_201(cliente: TestClient) -> None:
    nombre = "Menu 2026 " + "a" * 40

    respuesta = cliente.post(RUTA, json={"nombre": nombre, "orden": 1})

    assert len(nombre) == 50
    assert respuesta.status_code == 201


# CA 5
@pytest.mark.parametrize("orden", ["3", 2.0, 2.5, True, 0, -1])
def test_crear_seccion_con_orden_invalido_responde_422(cliente: TestClient, orden) -> None:
    respuesta = cliente.post(RUTA, json={"nombre": "Entradas", "orden": orden})

    assert respuesta.status_code == 422
    assert "orden" in respuesta.json()["detalle"]


# CA 6
def test_crear_seccion_con_orden_ocupado_responde_409(cliente: TestClient) -> None:
    cliente.post(RUTA, json={"nombre": "Postres", "orden": 1})

    respuesta = cliente.post(RUTA, json={"nombre": "Entradas", "orden": 1})

    assert respuesta.status_code == 409
    assert "osición ocupada" in respuesta.json()["detalle"]
    assert [s["nombre"] for s in cliente.get(RUTA).json()["items"]] == ["Postres"]


# CA 7 y 8
def test_crear_seccion_con_ids_repetidos_responde_422(cliente: TestClient) -> None:
    respuesta = cliente.post(RUTA, json={"nombre": "Nueva", "orden": 1, "producto_ids": [1, 1]})

    assert respuesta.status_code == 422


def test_crear_seccion_con_producto_inexistente_responde_404(cliente: TestClient) -> None:
    respuesta = cliente.post(
        RUTA, json={"nombre": "Nueva", "orden": 1, "producto_ids": [99], "confirmar_traslado": True}
    )

    assert respuesta.status_code == 404
    assert "detalle" in respuesta.json()


def test_traslado_sin_confirmar_responde_409_y_confirmado_responde_201(
    cliente: TestClient, fabrica_seccion, fabrica_producto
) -> None:
    flan = fabrica_producto(fabrica_seccion("Postres", 1), "Flan")
    cuerpo = {"nombre": "Nueva", "orden": 2, "producto_ids": [flan.id]}

    sin_confirmar = cliente.post(RUTA, json=cuerpo)
    confirmado = cliente.post(RUTA, json={**cuerpo, "confirmar_traslado": True})

    assert sin_confirmar.status_code == 409
    assert "Flan" in sin_confirmar.json()["detalle"]
    assert "Postres" in sin_confirmar.json()["detalle"]
    assert confirmado.status_code == 201
    assert confirmado.json()["productos"] == [{"id": flan.id, "nombre": "Flan"}]
    productos = cliente.get("/api/v1/productos").json()["items"]
    assert productos[0]["seccion"] == {"id": confirmado.json()["id"], "nombre": "Nueva"}


# Listados
def test_listar_secciones_pagina_y_ordena_por_orden(cliente: TestClient) -> None:
    for nombre, orden in [("C", 3), ("A", 1), ("B", 2)]:
        cliente.post(RUTA, json={"nombre": nombre, "orden": orden})

    respuesta = cliente.get(RUTA, params={"limit": 2, "offset": 0})

    cuerpo = respuesta.json()
    assert [s["nombre"] for s in cuerpo["items"]] == ["A", "B"]
    assert (cuerpo["total"], cuerpo["limit"], cuerpo["offset"]) == (3, 2, 0)
    assert cuerpo["items"][0]["cantidad_productos"] == 0


@pytest.mark.parametrize("ruta", [RUTA, "/api/v1/productos"])
def test_listar_con_limit_fuera_de_rango_responde_422(cliente: TestClient, ruta: str) -> None:
    assert cliente.get(ruta, params={"limit": 101}).status_code == 422
    assert cliente.get(ruta, params={"offset": -1}).status_code == 422


def test_listar_productos_solo_trae_habilitados(
    cliente: TestClient, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion("Postres", 1)
    fabrica_producto(seccion, "Flan")
    fabrica_producto(seccion, "Helado", Estado.DESHABILITADO)

    respuesta = cliente.get("/api/v1/productos")

    cuerpo = respuesta.json()
    assert [p["nombre"] for p in cuerpo["items"]] == ["Flan"]
    assert cuerpo["items"][0]["categoria"] == "POSTRE"
    assert cuerpo["total"] == 1


def test_listar_productos_sin_datos_devuelve_pagina_vacia(cliente: TestClient) -> None:
    respuesta = cliente.get("/api/v1/productos")

    assert respuesta.json() == {"items": [], "total": 0, "limit": 50, "offset": 0}
