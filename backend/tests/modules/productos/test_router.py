import io
import json
import os
from pathlib import Path

import pillow_heif
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image

from app.main import montar_media
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


# ---------------------------------------------------------------------------
# HU-M1-01: POST /platos y filtro de /secciones
# ---------------------------------------------------------------------------

RUTA_PLATOS = "/api/v1/platos"
MAXIMO_BYTES = 5 * 1024 * 1024


def _imagen(formato: str = "JPEG", tamano: tuple[int, int] = (8, 4)) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", tamano, "red").save(buffer, formato)
    return buffer.getvalue()


def _datos(seccion_id: int, **cambios) -> dict:
    base = {
        "nombre": "Milanesa",
        "seccion_id": seccion_id,
        "precio": "1500.50",
        "ingredientes": ["Carne", "Pan"],
    }
    return base | cambios


def _crear(cliente: TestClient, datos: dict, imagen: tuple | None = None, **formulario):
    archivos = {"imagen": imagen} if imagen else None
    return cliente.post(RUTA_PLATOS, data={"datos": json.dumps(datos)} | formulario, files=archivos)


# CA 1 y CA 14
def test_crear_plato_responde_201_con_la_forma_de_producto_salida(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Platos")

    respuesta = _crear(cliente, _datos(seccion.id, nombre="  Milanesa "))

    assert respuesta.status_code == 201
    assert respuesta.json() == {
        "id": 1,
        "nombre": "Milanesa",
        "categoria": "PLATO",
        "precio": "1500.50",
        "ingredientes": ["Carne", "Pan"],
        "descripcion": None,
        "etiquetas": [],
        "estado": "HABILITADO",
        "seccion": {"id": seccion.id, "nombre": "Platos"},
        "imagen_url": None,
    }


def test_crear_plato_completo_con_imagen_devuelve_su_url(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Platos")
    datos = _datos(seccion.id, descripcion="Con papas", etiquetas=["Sin TACC", "Casero"])

    respuesta = _crear(cliente, datos, ("mi foto.jpg", _imagen(), "image/jpeg"))

    cuerpo = respuesta.json()
    assert respuesta.status_code == 201
    assert (cuerpo["descripcion"], cuerpo["etiquetas"]) == ("Con papas", ["Sin TACC", "Casero"])
    assert cuerpo["imagen_url"].startswith("/media/")
    assert cuerpo["imagen_url"].endswith(".jpg")
    assert len(list(directorio_media.iterdir())) == 1


def test_crear_plato_con_imagen_de_2_mb_la_deja_servida(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Platos")
    ruido = Image.frombytes("RGB", (840, 840), os.urandom(840 * 840 * 3))
    buffer = io.BytesIO()
    ruido.save(buffer, "PNG")
    assert 2_000_000 < len(buffer.getvalue()) < MAXIMO_BYTES

    respuesta = _crear(cliente, _datos(seccion.id), ("plato.png", buffer.getvalue(), "image/png"))

    aplicacion = FastAPI()
    montar_media(aplicacion, directorio_media)
    servida = TestClient(aplicacion).get(respuesta.json()["imagen_url"])
    assert respuesta.status_code == 201
    assert servida.status_code == 200
    assert servida.headers["content-type"] == "image/png"


# CA 12
def test_crear_plato_con_heic_lo_sirve_como_jpeg(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    pillow_heif.register_heif_opener()
    seccion = fabrica_seccion("Platos")

    respuesta = _crear(cliente, _datos(seccion.id), ("foto.heic", _imagen("HEIF"), "image/heic"))

    aplicacion = FastAPI()
    montar_media(aplicacion, directorio_media)
    servida = TestClient(aplicacion).get(respuesta.json()["imagen_url"])
    assert respuesta.status_code == 201
    assert respuesta.json()["imagen_url"].endswith(".jpg")
    assert servida.headers["content-type"] == "image/jpeg"
    assert Image.open(io.BytesIO(servida.content)).format == "JPEG"


# CA 2
def test_crear_plato_sin_seccion_ni_precio_indica_los_dos_campos(
    cliente: TestClient, fabrica_seccion
) -> None:
    datos = _datos(fabrica_seccion("Platos").id)
    del datos["seccion_id"], datos["precio"]

    respuesta = _crear(cliente, datos)

    assert respuesta.status_code == 422
    assert "seccion_id" in respuesta.json()["detalle"]
    assert "precio" in respuesta.json()["detalle"]


def test_crear_plato_con_parte_imagen_vacia_equivale_a_sin_imagen(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Platos")

    respuesta = _crear(cliente, _datos(seccion.id), ("", b"", "application/octet-stream"))

    assert respuesta.status_code == 201
    assert respuesta.json()["imagen_url"] is None


# CA 2, 4, 5, 6, 7, 13: 422 por campo
@pytest.mark.parametrize(
    "cambios, campo",
    [
        ({"nombre": "   "}, "nombre"),
        ({"nombre": "a" * 101}, "nombre"),
        ({"precio": "0"}, "precio"),
        ({"precio": "-5"}, "precio"),
        ({"precio": "mil"}, "precio"),
        ({"precio": "1500.555"}, "precio"),
        ({"ingredientes": []}, "ingredientes"),
        ({"ingredientes": ["Huevo", " huevo "]}, "ingredientes"),
        ({"descripcion": "a" * 501}, "descripcion"),
        ({"etiquetas": ["a" * 31]}, "etiquetas"),
        ({"etiquetas": ["casero", "Casero"]}, "etiquetas"),
        ({"categoria": "POSTRE"}, "categoria"),
    ],
)
def test_crear_plato_con_datos_invalidos_responde_422_sin_guardar(
    cliente: TestClient, fabrica_seccion, directorio_media: Path, cambios: dict, campo: str
) -> None:
    seccion = fabrica_seccion("Platos")

    respuesta = _crear(cliente, _datos(seccion.id, **cambios))

    assert respuesta.status_code == 422
    assert campo in respuesta.json()["detalle"]
    assert cliente.get("/api/v1/productos").json()["total"] == 0


@pytest.mark.parametrize("faltante", ["nombre", "seccion_id", "precio", "ingredientes"])
def test_crear_plato_sin_campos_obligatorios_responde_422_e_indica_el_campo(
    cliente: TestClient, fabrica_seccion, faltante: str
) -> None:
    datos = _datos(fabrica_seccion("Platos").id)
    del datos[faltante]

    respuesta = _crear(cliente, datos)

    assert respuesta.status_code == 422
    assert faltante in respuesta.json()["detalle"]


def test_crear_plato_con_json_invalido_responde_422(cliente: TestClient) -> None:
    respuesta = cliente.post(RUTA_PLATOS, data={"datos": "{no es json"})

    assert respuesta.status_code == 422
    assert list(respuesta.json()) == ["detalle"]


# S10: estado y categoria enviados como campos del formulario se ignoran
def test_crear_plato_ignora_estado_y_categoria_enviados_fuera_de_datos(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Platos")

    respuesta = _crear(cliente, _datos(seccion.id), estado="DESHABILITADO", categoria="BEBIDA")

    assert respuesta.status_code == 201
    assert (respuesta.json()["estado"], respuesta.json()["categoria"]) == ("HABILITADO", "PLATO")


# CA 9
def test_crear_plato_con_seccion_inexistente_responde_404(cliente: TestClient) -> None:
    respuesta = _crear(cliente, _datos(999))

    assert respuesta.status_code == 404
    assert "detalle" in respuesta.json()


def test_crear_plato_con_seccion_deshabilitada_responde_409(
    cliente: TestClient, fabrica_seccion
) -> None:
    seccion = fabrica_seccion("Viejos", estado=Estado.DESHABILITADO)

    respuesta = _crear(cliente, _datos(seccion.id))

    assert respuesta.status_code == 409


# CA 3
def test_crear_plato_con_nombre_repetido_responde_409(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Platos")
    _crear(cliente, _datos(seccion.id, nombre="Milanesa"))

    respuesta = _crear(cliente, _datos(seccion.id, nombre="  milanesa "))

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": "El plato ya está registrado"}


# CA 10
@pytest.mark.parametrize(
    "archivo",
    [
        ("plato.jpg", b"texto con extension falsa", "image/jpeg"),
        ("plato.pdf", b"%PDF-1.4\n", "application/pdf"),
        ("plato.jpg", b"\0" * (MAXIMO_BYTES + 1), "image/jpeg"),
    ],
    ids=["extension-falsa", "pdf", "mas-de-5-mb"],
)
def test_crear_plato_con_imagen_invalida_responde_422_y_no_guarda_nada(
    cliente: TestClient, fabrica_seccion, directorio_media: Path, archivo: tuple
) -> None:
    seccion = fabrica_seccion("Platos")

    respuesta = _crear(cliente, _datos(seccion.id), archivo)

    assert respuesta.status_code == 422
    assert "JPG, PNG o HEIC" in respuesta.json()["detalle"]
    assert not directorio_media.exists()
    assert cliente.get("/api/v1/productos").json()["total"] == 0


# CA 12
def test_crear_plato_ignora_el_nombre_original_de_la_imagen(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Platos")

    respuesta = _crear(
        cliente, _datos(seccion.id), ("../../mi foto.png", _imagen("PNG"), "image/png")
    )

    assert respuesta.status_code == 201
    assert respuesta.json()["imagen_url"].removeprefix("/media/").removesuffix(".png").isalnum()
    assert len(respuesta.json()["imagen_url"]) == len("/media/") + 32 + len(".png")


# Filtro por estado
def test_listar_secciones_con_estado_habilitado_filtra_y_cuenta(
    cliente: TestClient, fabrica_seccion
) -> None:
    fabrica_seccion("A", 1)
    fabrica_seccion("B", 2, Estado.DESHABILITADO)
    fabrica_seccion("C", 3)

    respuesta = cliente.get(RUTA, params={"estado": "HABILITADO"})

    cuerpo = respuesta.json()
    assert [s["nombre"] for s in cuerpo["items"]] == ["A", "C"]
    assert cuerpo["total"] == 2


def test_listar_secciones_sin_estado_incluye_todas(cliente: TestClient, fabrica_seccion) -> None:
    fabrica_seccion("A", 1)
    fabrica_seccion("B", 2, Estado.DESHABILITADO)

    cuerpo = cliente.get(RUTA).json()

    assert [s["nombre"] for s in cuerpo["items"]] == ["A", "B"]
    assert cuerpo["total"] == 2


def test_listar_secciones_con_estado_invalido_responde_422(cliente: TestClient) -> None:
    respuesta = cliente.get(RUTA, params={"estado": "ABIERTO"})

    assert respuesta.status_code == 422
    assert "estado" in respuesta.json()["detalle"]
