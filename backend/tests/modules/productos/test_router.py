import io
import json
import os
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path

import pillow_heif
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import text

from app.main import montar_media
from app.modules.productos.models import Seccion
from app.shared.models import Categoria, Estado, Producto

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
        "productos_habilitados": 0,
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


RUTA_PRODUCTOS = "/api/v1/productos"


def _carta_de_tres_categorias(fabrica_seccion, fabrica_producto) -> None:
    seccion = fabrica_seccion("Carta", 1)
    fabrica_producto(seccion, "Milanesa", categoria=Categoria.PLATO)
    fabrica_producto(seccion, "Flan", categoria=Categoria.POSTRE)
    fabrica_producto(seccion, "Agua", categoria=Categoria.BEBIDA)


def _nombres(respuesta) -> list[str]:
    return [p["nombre"] for p in respuesta.json()["items"]]


# CA 1
def test_listar_productos_items_con_detalle(
    cliente: TestClient, fabrica_seccion, fabrica_producto
) -> None:
    _carta_de_tres_categorias(fabrica_seccion, fabrica_producto)

    items = cliente.get(RUTA_PRODUCTOS).json()["items"]

    assert [(p["nombre"], p["categoria"]) for p in items] == [
        ("Agua", "BEBIDA"),
        ("Flan", "POSTRE"),
        ("Milanesa", "PLATO"),
    ]
    assert set(items[0]) == {
        "id",
        "nombre",
        "categoria",
        "seccion",
        "precio",
        "etiquetas",
        "estado",
    }
    assert items[0]["seccion"] == {"id": 1, "nombre": "Carta"}
    assert items[0]["etiquetas"] == []
    assert items[0]["estado"] == "HABILITADO"


# CA 2
def test_listar_productos_sin_productos_estado_todos_vacio(cliente: TestClient) -> None:
    respuesta = cliente.get(RUTA_PRODUCTOS, params={"estado": "TODOS"})

    assert respuesta.status_code == 200
    assert respuesta.json() == {"items": [], "total": 0, "limit": 50, "offset": 0}


# CA 3
def test_listar_productos_sin_estado_usa_habilitado(
    cliente: TestClient, fabrica_seccion, fabrica_producto
) -> None:
    fabrica_producto(fabrica_seccion("Carta", 1), "Helado", Estado.DESHABILITADO)

    assert cliente.get(RUTA_PRODUCTOS).json()["items"] == []


# CA 4
def test_listar_productos_estado_habilitado_solo_habilitados(
    cliente: TestClient, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion("Carta", 1)
    fabrica_producto(seccion, "Flan")
    fabrica_producto(seccion, "Helado", Estado.DESHABILITADO)

    respuesta = cliente.get(RUTA_PRODUCTOS, params={"estado": "HABILITADO"})

    assert _nombres(respuesta) == ["Flan"]
    assert respuesta.json()["total"] == 1


# CA 5
def test_listar_productos_estado_deshabilitado_solo_dados_de_baja(
    cliente: TestClient, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion("Carta", 1)
    plato = fabrica_producto(seccion, "Milanesa", categoria=Categoria.PLATO)
    fabrica_producto(seccion, "Flan")
    fabrica_producto(seccion, "Helado", Estado.DESHABILITADO)
    assert cliente.post(f"/api/v1/platos/{plato.id}/baja").status_code == 200

    respuesta = cliente.get(RUTA_PRODUCTOS, params={"estado": "DESHABILITADO"})

    assert _nombres(respuesta) == ["Helado", "Milanesa"]
    assert {p["estado"] for p in respuesta.json()["items"]} == {"DESHABILITADO"}
    assert respuesta.json()["total"] == 2


# CA 6
def test_listar_productos_estado_todos_con_su_estado(
    cliente: TestClient, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion("Carta", 1)
    fabrica_producto(seccion, "Flan")
    fabrica_producto(seccion, "Helado", Estado.DESHABILITADO)

    respuesta = cliente.get(RUTA_PRODUCTOS, params={"estado": "TODOS"})

    assert [(p["nombre"], p["estado"]) for p in respuesta.json()["items"]] == [
        ("Flan", "HABILITADO"),
        ("Helado", "DESHABILITADO"),
    ]
    assert respuesta.json()["total"] == 2


def test_listar_productos_estado_invalido_422(cliente: TestClient) -> None:
    respuesta = cliente.get(RUTA_PRODUCTOS, params={"estado": "ANULADO"})

    assert respuesta.status_code == 422
    assert "estado" in respuesta.json()["detalle"]


@pytest.mark.parametrize("limit", [0, 101])
def test_listar_productos_limit_fuera_de_rango_422(cliente: TestClient, limit: int) -> None:
    respuesta = cliente.get(RUTA_PRODUCTOS, params={"estado": "TODOS", "limit": limit})

    assert respuesta.status_code == 422
    assert "limit" in respuesta.json()["detalle"]


def test_listar_productos_segunda_pagina_con_filtro(
    cliente: TestClient, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion("Carta", 1)
    for nombre in ("Alfa", "Beta", "Gama"):
        fabrica_producto(seccion, nombre)
    fabrica_producto(seccion, "Delta", Estado.DESHABILITADO)

    parametros = {"estado": "HABILITADO", "limit": 2, "offset": 2}
    respuesta = cliente.get(RUTA_PRODUCTOS, params=parametros)

    cuerpo = respuesta.json()
    assert _nombres(respuesta) == ["Gama"]
    assert (cuerpo["total"], cuerpo["limit"], cuerpo["offset"]) == (3, 2, 2)


def test_listar_productos_precio_como_texto(
    cliente: TestClient, db, fabrica_seccion, fabrica_producto
) -> None:
    producto = fabrica_producto(fabrica_seccion("Carta", 1), "Flan")
    producto.precio = Decimal("12500.50")
    db.commit()

    assert cliente.get(RUTA_PRODUCTOS).json()["items"][0]["precio"] == "12500.50"


def test_listar_productos_no_modifica_datos(
    cliente: TestClient, db, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion("Carta", 1)
    fabrica_producto(seccion, "Flan")
    fabrica_producto(seccion, "Helado", Estado.DESHABILITADO)

    def foto() -> list[tuple]:
        db.expire_all()
        return [(p.id, p.nombre, p.estado, p.precio) for p in db.query(Producto).all()]

    antes = foto()
    cliente.get(RUTA_PRODUCTOS, params={"estado": "TODOS"})

    assert foto() == antes


# Regresion (S29): sin parametros conserva items, orden y total del selector de SeccionesTab
def test_listar_productos_sin_parametros_conserva_items_orden_y_total(
    cliente: TestClient, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion("Carta", 1)
    fabrica_producto(seccion, "Zeta")
    fabrica_producto(seccion, "Alfa", categoria=Categoria.PLATO)
    fabrica_producto(seccion, "Beta", Estado.DESHABILITADO)

    cuerpo = cliente.get(RUTA_PRODUCTOS).json()

    assert [(p["id"], p["nombre"], p["categoria"]) for p in cuerpo["items"]] == [
        (2, "Alfa", "PLATO"),
        (1, "Zeta", "POSTRE"),
    ]
    assert cuerpo["items"][0]["seccion"] == {"id": 1, "nombre": "Carta"}
    assert (cuerpo["total"], cuerpo["limit"], cuerpo["offset"]) == (2, 50, 0)


# ---------------------------------------------------------------------------
# HU-M1-01 y HU-M1-04: POST /platos, POST /postres y filtro de /secciones
# ---------------------------------------------------------------------------

MAXIMO_BYTES = 5 * 1024 * 1024


@dataclass(frozen=True)
class Alta:
    """Lo que cambia entre las altas de cada categoria (C2)."""

    ruta: str
    categoria: str
    mensaje_nombre_repetido: str


@pytest.fixture(
    params=[
        Alta("/api/v1/platos", "PLATO", "El plato ya está registrado"),
        Alta("/api/v1/postres", "POSTRE", "El postre ya está registrado"),
        Alta("/api/v1/bebidas", "BEBIDA", "La bebida ya está registrada"),
    ],
    ids=["plato", "postre", "bebida"],
)
def alta(request: pytest.FixtureRequest) -> Alta:
    return request.param


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


def _crear(cliente: TestClient, alta: Alta, datos: dict, imagen: tuple | None = None, **formulario):
    archivos = {"imagen": imagen} if imagen else None
    return cliente.post(alta.ruta, data={"datos": json.dumps(datos)} | formulario, files=archivos)


# CA 1 y CA 14
def test_crear_producto_responde_201_con_la_forma_de_producto_salida(
    alta: Alta, cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Platos")

    respuesta = _crear(cliente, alta, _datos(seccion.id, nombre="  Milanesa "))

    assert respuesta.status_code == 201
    assert respuesta.json() == {
        "id": 1,
        "nombre": "Milanesa",
        "categoria": alta.categoria,
        "precio": "1500.50",
        "ingredientes": ["Carne", "Pan"],
        "descripcion": None,
        "etiquetas": [],
        "estado": "HABILITADO",
        "seccion": {"id": seccion.id, "nombre": "Platos"},
        "imagen_url": None,
    }


def test_crear_producto_completo_con_imagen_devuelve_su_url(
    alta: Alta, cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Platos")
    datos = _datos(seccion.id, descripcion="Con papas", etiquetas=["Sin TACC", "Casero"])

    respuesta = _crear(cliente, alta, datos, ("mi foto.jpg", _imagen(), "image/jpeg"))

    cuerpo = respuesta.json()
    assert respuesta.status_code == 201
    assert (cuerpo["descripcion"], cuerpo["etiquetas"]) == ("Con papas", ["Sin TACC", "Casero"])
    assert cuerpo["imagen_url"].startswith("/media/")
    assert cuerpo["imagen_url"].endswith(".jpg")
    assert len(list(directorio_media.iterdir())) == 1


def test_crear_producto_con_imagen_de_2_mb_la_deja_servida(
    alta: Alta, cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Platos")
    ruido = Image.frombytes("RGB", (840, 840), os.urandom(840 * 840 * 3))
    buffer = io.BytesIO()
    ruido.save(buffer, "PNG")
    assert 2_000_000 < len(buffer.getvalue()) < MAXIMO_BYTES

    respuesta = _crear(
        cliente, alta, _datos(seccion.id), ("plato.png", buffer.getvalue(), "image/png")
    )

    aplicacion = FastAPI()
    montar_media(aplicacion, directorio_media)
    servida = TestClient(aplicacion).get(respuesta.json()["imagen_url"])
    assert respuesta.status_code == 201
    assert servida.status_code == 200
    assert servida.headers["content-type"] == "image/png"


# CA 12
def test_crear_producto_con_heic_lo_sirve_como_jpeg(
    alta: Alta, cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    pillow_heif.register_heif_opener()
    seccion = fabrica_seccion("Platos")

    respuesta = _crear(
        cliente, alta, _datos(seccion.id), ("foto.heic", _imagen("HEIF"), "image/heic")
    )

    aplicacion = FastAPI()
    montar_media(aplicacion, directorio_media)
    servida = TestClient(aplicacion).get(respuesta.json()["imagen_url"])
    assert respuesta.status_code == 201
    assert respuesta.json()["imagen_url"].endswith(".jpg")
    assert servida.headers["content-type"] == "image/jpeg"
    assert Image.open(io.BytesIO(servida.content)).format == "JPEG"


# CA 2
def test_crear_producto_sin_seccion_ni_precio_indica_los_dos_campos(
    alta: Alta, cliente: TestClient, fabrica_seccion
) -> None:
    datos = _datos(fabrica_seccion("Platos").id)
    del datos["seccion_id"], datos["precio"]

    respuesta = _crear(cliente, alta, datos)

    assert respuesta.status_code == 422
    assert "seccion_id" in respuesta.json()["detalle"]
    assert "precio" in respuesta.json()["detalle"]


def test_crear_producto_con_parte_imagen_vacia_equivale_a_sin_imagen(
    alta: Alta, cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Platos")

    respuesta = _crear(cliente, alta, _datos(seccion.id), ("", b"", "application/octet-stream"))

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
        ({"ingredientes": ["  "]}, "ingredientes"),
        ({"ingredientes": ["Huevo", " huevo "]}, "ingredientes"),
        ({"descripcion": "a" * 501}, "descripcion"),
        ({"etiquetas": ["a" * 31]}, "etiquetas"),
        ({"etiquetas": ["casero", "Casero"]}, "etiquetas"),
        ({"categoria": "POSTRE"}, "categoria"),
    ],
)
def test_crear_producto_con_datos_invalidos_responde_422_sin_guardar(
    alta: Alta,
    cliente: TestClient,
    fabrica_seccion,
    directorio_media: Path,
    cambios: dict,
    campo: str,
) -> None:
    seccion = fabrica_seccion("Platos")

    respuesta = _crear(cliente, alta, _datos(seccion.id, **cambios))

    assert respuesta.status_code == 422
    assert campo in respuesta.json()["detalle"]
    assert cliente.get("/api/v1/productos").json()["total"] == 0


@pytest.mark.parametrize("faltante", ["nombre", "seccion_id", "precio"])
def test_crear_producto_sin_campos_obligatorios_responde_422_e_indica_el_campo(
    alta: Alta, cliente: TestClient, fabrica_seccion, faltante: str
) -> None:
    datos = _datos(fabrica_seccion("Platos").id)
    del datos[faltante]

    respuesta = _crear(cliente, alta, datos)

    assert respuesta.status_code == 422
    assert faltante in respuesta.json()["detalle"]


def test_crear_producto_con_json_invalido_responde_422(alta: Alta, cliente: TestClient) -> None:
    respuesta = cliente.post(alta.ruta, data={"datos": "{no es json"})

    assert respuesta.status_code == 422
    assert list(respuesta.json()) == ["detalle"]


# S10: estado y categoria enviados como campos del formulario se ignoran
def test_crear_producto_ignora_estado_y_categoria_enviados_fuera_de_datos(
    alta: Alta, cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Platos")

    respuesta = _crear(
        cliente, alta, _datos(seccion.id), estado="DESHABILITADO", categoria="BEBIDA"
    )

    assert respuesta.status_code == 201
    assert (respuesta.json()["estado"], respuesta.json()["categoria"]) == (
        "HABILITADO",
        alta.categoria,
    )


# CA 9
def test_crear_producto_con_seccion_inexistente_responde_404(
    alta: Alta, cliente: TestClient
) -> None:
    respuesta = _crear(cliente, alta, _datos(999))

    assert respuesta.status_code == 404
    assert "detalle" in respuesta.json()


def test_crear_producto_con_seccion_deshabilitada_responde_409(
    alta: Alta, cliente: TestClient, fabrica_seccion
) -> None:
    seccion = fabrica_seccion("Viejos", estado=Estado.DESHABILITADO)

    respuesta = _crear(cliente, alta, _datos(seccion.id))

    assert respuesta.status_code == 409


# CA 3
def test_crear_producto_con_nombre_repetido_responde_409(
    alta: Alta, cliente: TestClient, fabrica_seccion
) -> None:
    seccion = fabrica_seccion("Platos")
    _crear(cliente, alta, _datos(seccion.id, nombre="Milanesa"))

    respuesta = _crear(cliente, alta, _datos(seccion.id, nombre="  milanesa "))

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": alta.mensaje_nombre_repetido}


# CA 3, S13 y S14: el nombre es unico por categoria
ALTA_PLATO = Alta("/api/v1/platos", "PLATO", "El plato ya está registrado")
ALTA_POSTRE = Alta("/api/v1/postres", "POSTRE", "El postre ya está registrado")
ALTA_BEBIDA = Alta("/api/v1/bebidas", "BEBIDA", "La bebida ya está registrada")


def test_crear_postre_con_nombre_de_plato_convive_y_el_plato_repetido_da_409(
    cliente: TestClient, fabrica_seccion
) -> None:
    seccion = fabrica_seccion("Carta")
    _crear(cliente, ALTA_PLATO, _datos(seccion.id, nombre="Flan"))

    postre = _crear(cliente, ALTA_POSTRE, _datos(seccion.id, nombre="Flan"))
    plato_repetido = _crear(cliente, ALTA_PLATO, _datos(seccion.id, nombre="flan"))

    assert postre.status_code == 201
    assert postre.json()["categoria"] == "POSTRE"
    assert plato_repetido.status_code == 409
    assert plato_repetido.json() == {"detalle": "El plato ya está registrado"}


def test_crear_postre_con_nombre_repetido_dice_postre(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Carta")
    _crear(cliente, ALTA_POSTRE, _datos(seccion.id, nombre="Flan"))

    respuesta = _crear(cliente, ALTA_POSTRE, _datos(seccion.id, nombre="  flan "))

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": "El postre ya está registrado"}


# CA 6: los ingredientes son obligatorios en platos y postres, y opcionales en bebidas (S44)
@pytest.mark.parametrize("alta", [ALTA_PLATO, ALTA_POSTRE], ids=["plato", "postre"])
@pytest.mark.parametrize("ingredientes", [None, []], ids=["ausentes", "vacios"])
def test_crear_producto_sin_ingredientes_422(
    alta: Alta, cliente: TestClient, fabrica_seccion, ingredientes
) -> None:
    datos = _datos(fabrica_seccion("Carta").id)
    del datos["ingredientes"]
    if ingredientes is not None:
        datos["ingredientes"] = ingredientes

    respuesta = _crear(cliente, alta, datos)

    assert respuesta.status_code == 422
    assert "ingredientes" in respuesta.json()["detalle"]


@pytest.mark.parametrize("ingredientes", [None, []], ids=["ausentes", "vacios"])
def test_crear_bebida_sin_ingredientes_201(
    cliente: TestClient, fabrica_seccion, ingredientes
) -> None:
    datos = _datos(fabrica_seccion("Carta").id)
    del datos["ingredientes"]
    if ingredientes is not None:
        datos["ingredientes"] = ingredientes

    respuesta = _crear(cliente, ALTA_BEBIDA, datos)

    assert respuesta.status_code == 201
    assert respuesta.json()["ingredientes"] == []


# S14: una bebida puede llamarse igual que un postre, pero no repetirse entre bebidas
def test_crear_bebida_con_nombre_de_postre_convive(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Carta")
    _crear(cliente, ALTA_POSTRE, _datos(seccion.id, nombre="Tiramisú"))

    bebida = _crear(cliente, ALTA_BEBIDA, _datos(seccion.id, nombre="Tiramisú"))
    repetida = _crear(cliente, ALTA_BEBIDA, _datos(seccion.id, nombre="tiramisú"))

    assert bebida.status_code == 201
    assert bebida.json()["categoria"] == "BEBIDA"
    assert repetida.status_code == 409
    assert repetida.json() == {"detalle": "La bebida ya está registrada"}


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
def test_crear_producto_con_imagen_invalida_responde_422_y_no_guarda_nada(
    alta: Alta, cliente: TestClient, fabrica_seccion, directorio_media: Path, archivo: tuple
) -> None:
    seccion = fabrica_seccion("Platos")

    respuesta = _crear(cliente, alta, _datos(seccion.id), archivo)

    assert respuesta.status_code == 422
    assert "JPG, PNG o HEIC" in respuesta.json()["detalle"]
    assert not directorio_media.exists()
    assert cliente.get("/api/v1/productos").json()["total"] == 0


# CA 12
def test_crear_producto_ignora_el_nombre_original_de_la_imagen(
    alta: Alta, cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Platos")

    respuesta = _crear(
        cliente, alta, _datos(seccion.id), ("../../mi foto.png", _imagen("PNG"), "image/png")
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


# ---------------------------------------------------------------------------
# HU-M1-02-03: consultar, modificar y dar de baja un plato
# ---------------------------------------------------------------------------

RUTA_PLATOS = "/api/v1/platos"


def _crear_plato(cliente: TestClient, seccion_id: int, imagen: tuple | None = None, **cambios):
    respuesta = _crear(cliente, ALTA_PLATO, _datos(seccion_id, **cambios), imagen)
    assert respuesta.status_code == 201
    return respuesta.json()


def _deshabilitar(db, producto_id: int) -> None:
    db.get(Producto, producto_id).estado = Estado.DESHABILITADO
    db.commit()


# Consultar un plato
def test_consultar_plato_existente(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Platos")
    plato = _crear_plato(cliente, seccion.id, descripcion="Con papas", etiquetas=["Casero"])

    respuesta = cliente.get(f"{RUTA_PLATOS}/{plato['id']}")

    assert respuesta.status_code == 200
    assert respuesta.json() == plato


def test_consultar_plato_inexistente_404(cliente: TestClient) -> None:
    respuesta = cliente.get(f"{RUTA_PLATOS}/999")

    assert respuesta.status_code == 404
    assert "detalle" in respuesta.json()


def test_consultar_plato_de_otra_categoria_404(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Carta")
    postre = _crear(cliente, ALTA_POSTRE, _datos(seccion.id, nombre="Flan")).json()

    respuesta = cliente.get(f"{RUTA_PLATOS}/{postre['id']}")

    assert respuesta.status_code == 404


def test_consultar_plato_deshabilitado_200(cliente: TestClient, fabrica_seccion, db) -> None:
    seccion = fabrica_seccion("Platos")
    plato = _crear_plato(cliente, seccion.id)
    _deshabilitar(db, plato["id"])

    respuesta = cliente.get(f"{RUTA_PLATOS}/{plato['id']}")

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "DESHABILITADO"


# Modificar un plato
def _modificar(
    cliente: TestClient,
    producto_id: int,
    datos: dict,
    imagen: tuple | None = None,
    ruta: str = RUTA_PLATOS,
):
    archivos = {"imagen": imagen} if imagen else None
    return cliente.put(f"{ruta}/{producto_id}", data={"datos": json.dumps(datos)}, files=archivos)


def _sirve(directorio_media: Path, imagen_url: str) -> int:
    aplicacion = FastAPI()
    montar_media(aplicacion, directorio_media)
    return TestClient(aplicacion).get(imagen_url).status_code


def _plato_con_imagen(cliente: TestClient, seccion_id: int, **cambios) -> dict:
    return _crear_plato(cliente, seccion_id, ("foto.jpg", _imagen(), "image/jpeg"), **cambios)


# CA 1
def test_modificar_plato_datos_validos(cliente: TestClient, fabrica_seccion) -> None:
    origen = fabrica_seccion("Platos", 1)
    destino = fabrica_seccion("Minutas", 2)
    plato = _crear_plato(cliente, origen.id)

    respuesta = _modificar(
        cliente,
        plato["id"],
        _datos(destino.id, nombre="  Suprema ", precio="2000", descripcion="Con puré"),
    )

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["id"] == plato["id"]
    assert cuerpo["nombre"] == "Suprema"
    assert cuerpo["precio"] == "2000.00"
    assert cuerpo["descripcion"] == "Con puré"
    assert cuerpo["seccion"] == {"id": destino.id, "nombre": "Minutas"}
    assert cliente.get(f"{RUTA_PLATOS}/{plato['id']}").json() == cuerpo


def test_modificar_plato_mismo_nombre_200(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Platos")
    plato = _crear_plato(cliente, seccion.id, nombre="Milanesa")

    respuesta = _modificar(cliente, plato["id"], _datos(seccion.id, nombre="milanesa", precio="9"))

    assert respuesta.status_code == 200
    assert respuesta.json()["precio"] == "9.00"


# CA 2
def test_modificar_plato_ingredientes_y_etiquetas(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Platos")
    plato = _crear_plato(cliente, seccion.id, ingredientes=["Pan", "Huevo"], etiquetas=["Casero"])

    respuesta = _modificar(cliente, plato["id"], _datos(seccion.id, ingredientes=["Pan", "Queso"]))

    assert respuesta.status_code == 200
    assert respuesta.json()["ingredientes"] == ["Pan", "Queso"]
    assert respuesta.json()["etiquetas"] == []


def test_modificar_plato_imagen_conservada(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Platos")
    plato = _plato_con_imagen(cliente, seccion.id)

    respuesta = _modificar(cliente, plato["id"], _datos(seccion.id, precio="10"))

    assert respuesta.json()["imagen_url"] == plato["imagen_url"]
    assert _sirve(directorio_media, plato["imagen_url"]) == 200


def test_modificar_plato_imagen_reemplazada(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Platos")
    plato = _plato_con_imagen(cliente, seccion.id)

    respuesta = _modificar(
        cliente, plato["id"], _datos(seccion.id), ("nueva.png", _imagen("PNG"), "image/png")
    )

    nueva = respuesta.json()["imagen_url"]
    assert respuesta.status_code == 200
    assert nueva != plato["imagen_url"]
    assert _sirve(directorio_media, nueva) == 200
    assert _sirve(directorio_media, plato["imagen_url"]) == 404
    assert len(list(directorio_media.iterdir())) == 1


def test_modificar_plato_imagen_quitada(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Platos")
    plato = _plato_con_imagen(cliente, seccion.id)

    respuesta = _modificar(cliente, plato["id"], _datos(seccion.id, quitar_imagen=True))

    assert respuesta.status_code == 200
    assert respuesta.json()["imagen_url"] is None
    assert list(directorio_media.iterdir()) == []


def test_modificar_plato_quitar_y_reemplazar_422(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Platos")
    plato = _plato_con_imagen(cliente, seccion.id)

    respuesta = _modificar(
        cliente,
        plato["id"],
        _datos(seccion.id, nombre="Otro", quitar_imagen=True),
        ("nueva.png", _imagen("PNG"), "image/png"),
    )

    assert respuesta.status_code == 422
    assert cliente.get(f"{RUTA_PLATOS}/{plato['id']}").json() == plato
    assert len(list(directorio_media.iterdir())) == 1


# CA 3: validaciones; el plato conserva sus datos
@pytest.mark.parametrize(
    "cambios, campo",
    [
        ({"nombre": "   "}, "nombre"),
        ({"nombre": "a" * 101}, "nombre"),
    ],
)
def test_modificar_plato_nombre_invalido_422(
    cliente: TestClient, fabrica_seccion, cambios: dict, campo: str
) -> None:
    seccion = fabrica_seccion("Platos")
    plato = _crear_plato(cliente, seccion.id)

    respuesta = _modificar(cliente, plato["id"], _datos(seccion.id, **cambios))

    assert respuesta.status_code == 422
    assert campo in respuesta.json()["detalle"]
    assert cliente.get(f"{RUTA_PLATOS}/{plato['id']}").json() == plato


@pytest.mark.parametrize("precio", ["0", "-5", "mil", "1500.555"])
def test_modificar_plato_precio_invalido_422(
    cliente: TestClient, fabrica_seccion, precio: str
) -> None:
    seccion = fabrica_seccion("Platos")
    plato = _crear_plato(cliente, seccion.id)

    respuesta = _modificar(cliente, plato["id"], _datos(seccion.id, precio=precio))

    assert respuesta.status_code == 422
    assert "precio" in respuesta.json()["detalle"]
    assert cliente.get(f"{RUTA_PLATOS}/{plato['id']}").json()["precio"] == plato["precio"]


@pytest.mark.parametrize("ingredientes", [[], ["Huevo", " huevo "]], ids=["vacios", "repetidos"])
def test_modificar_plato_ingredientes_invalidos_422(
    cliente: TestClient, fabrica_seccion, ingredientes: list
) -> None:
    seccion = fabrica_seccion("Platos")
    plato = _crear_plato(cliente, seccion.id)

    respuesta = _modificar(cliente, plato["id"], _datos(seccion.id, ingredientes=ingredientes))

    assert respuesta.status_code == 422
    assert "ingredientes" in respuesta.json()["detalle"]


@pytest.mark.parametrize(
    "cambios, campo",
    [
        ({"etiquetas": ["a" * 31]}, "etiquetas"),
        ({"etiquetas": ["casero", "Casero"]}, "etiquetas"),
        ({"descripcion": "a" * 501}, "descripcion"),
    ],
)
def test_modificar_plato_etiquetas_y_descripcion_invalidas_422(
    cliente: TestClient, fabrica_seccion, cambios: dict, campo: str
) -> None:
    seccion = fabrica_seccion("Platos")
    plato = _crear_plato(cliente, seccion.id)

    respuesta = _modificar(cliente, plato["id"], _datos(seccion.id, **cambios))

    assert respuesta.status_code == 422
    assert campo in respuesta.json()["detalle"]


@pytest.mark.parametrize(
    "archivo",
    [
        ("plato.jpg", b"texto con extension falsa", "image/jpeg"),
        ("plato.pdf", b"%PDF-1.4\n", "application/pdf"),
        ("plato.jpg", b"\0" * (MAXIMO_BYTES + 1), "image/jpeg"),
    ],
    ids=["extension-falsa", "pdf", "mas-de-5-mb"],
)
def test_modificar_plato_imagen_invalida_422(
    cliente: TestClient, fabrica_seccion, directorio_media: Path, archivo: tuple
) -> None:
    seccion = fabrica_seccion("Platos")
    plato = _plato_con_imagen(cliente, seccion.id)
    anterior = {archivo.name for archivo in directorio_media.iterdir()}

    respuesta = _modificar(cliente, plato["id"], _datos(seccion.id, nombre="Otro"), archivo)

    assert respuesta.status_code == 422
    assert "JPG, PNG o HEIC" in respuesta.json()["detalle"]
    assert {archivo.name for archivo in directorio_media.iterdir()} == anterior
    assert cliente.get(f"{RUTA_PLATOS}/{plato['id']}").json() == plato


def test_modificar_plato_nombre_duplicado_409(cliente: TestClient, fabrica_seccion, db) -> None:
    seccion = fabrica_seccion("Platos")
    milanesa = _crear_plato(cliente, seccion.id, nombre="Milanesa")
    flan = _crear_plato(cliente, seccion.id, nombre="Flan casero")
    _deshabilitar(db, flan["id"])

    respuesta = _modificar(cliente, milanesa["id"], _datos(seccion.id, nombre=" flan casero "))

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": "El plato ya está registrado"}
    assert cliente.get(f"{RUTA_PLATOS}/{milanesa['id']}").json() == milanesa


def test_modificar_plato_mismo_nombre_que_postre_200(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Carta")
    _crear(cliente, ALTA_POSTRE, _datos(seccion.id, nombre="Tiramisú"))
    plato = _crear_plato(cliente, seccion.id, nombre="Milanesa")

    respuesta = _modificar(cliente, plato["id"], _datos(seccion.id, nombre="Tiramisú"))

    assert respuesta.status_code == 200


def test_modificar_plato_seccion_inexistente_404(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Platos")
    plato = _crear_plato(cliente, seccion.id)

    respuesta = _modificar(cliente, plato["id"], _datos(999))

    assert respuesta.status_code == 404
    assert cliente.get(f"{RUTA_PLATOS}/{plato['id']}").json() == plato


def test_modificar_plato_seccion_deshabilitada_409(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Platos", 1)
    vieja = fabrica_seccion("Viejos", 2, Estado.DESHABILITADO)
    plato = _crear_plato(cliente, seccion.id)

    respuesta = _modificar(cliente, plato["id"], _datos(vieja.id))

    assert respuesta.status_code == 409
    assert cliente.get(f"{RUTA_PLATOS}/{plato['id']}").json() == plato


def test_modificar_plato_inexistente_404(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Platos")

    respuesta = _modificar(cliente, 999, _datos(seccion.id))

    assert respuesta.status_code == 404
    assert "detalle" in respuesta.json()


def test_modificar_plato_de_postre_404(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Carta")
    postre = _crear(cliente, ALTA_POSTRE, _datos(seccion.id, nombre="Flan")).json()

    respuesta = _modificar(cliente, postre["id"], _datos(seccion.id, nombre="Flan 2"))

    assert respuesta.status_code == 404


# CA 5: reactivar
def test_modificar_plato_reactivar_200(cliente: TestClient, fabrica_seccion, db) -> None:
    seccion = fabrica_seccion("Platos")
    plato = _crear_plato(cliente, seccion.id)
    _deshabilitar(db, plato["id"])
    assert cliente.get("/api/v1/productos").json()["total"] == 0

    respuesta = _modificar(cliente, plato["id"], _datos(seccion.id, estado="HABILITADO"))

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "HABILITADO"
    assert cliente.get("/api/v1/productos").json()["total"] == 1


def test_modificar_plato_sin_estado_conserva_el_actual(
    cliente: TestClient, fabrica_seccion, db
) -> None:
    seccion = fabrica_seccion("Platos")
    plato = _crear_plato(cliente, seccion.id)
    _deshabilitar(db, plato["id"])

    respuesta = _modificar(cliente, plato["id"], _datos(seccion.id, precio="11"))

    assert respuesta.json()["estado"] == "DESHABILITADO"


def test_modificar_plato_deshabilitar_con_estado_200(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Platos")
    plato = _crear_plato(cliente, seccion.id)

    respuesta = _modificar(cliente, plato["id"], _datos(seccion.id, estado="DESHABILITADO"))

    assert respuesta.json()["estado"] == "DESHABILITADO"
    assert cliente.get("/api/v1/productos").json()["total"] == 0


def test_modificar_plato_reactivar_en_seccion_deshabilitada_200(
    cliente: TestClient, fabrica_seccion, db
) -> None:
    seccion = fabrica_seccion("Platos")
    plato = _crear_plato(cliente, seccion.id)
    _deshabilitar(db, plato["id"])
    db.get(Seccion, seccion.id).estado = Estado.DESHABILITADO
    db.commit()

    respuesta = _modificar(cliente, plato["id"], _datos(seccion.id, estado="HABILITADO"))

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "HABILITADO"


def test_modificar_plato_estado_invalido_422(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Platos")
    plato = _crear_plato(cliente, seccion.id)

    respuesta = _modificar(cliente, plato["id"], _datos(seccion.id, estado="ANULADO"))

    assert respuesta.status_code == 422
    assert "estado" in respuesta.json()["detalle"]


def test_modificar_plato_con_categoria_enviada_422(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Platos")
    plato = _crear_plato(cliente, seccion.id)

    respuesta = _modificar(cliente, plato["id"], _datos(seccion.id, categoria="POSTRE"))

    assert respuesta.status_code == 422
    assert "categoria" in respuesta.json()["detalle"]


# Dar de baja un plato
def _baja(cliente: TestClient, producto_id: int, ruta: str = RUTA_PLATOS):
    return cliente.post(f"{ruta}/{producto_id}/baja")


def test_dar_de_baja_plato_200(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Platos")
    plato = _crear_plato(cliente, seccion.id)
    assert cliente.get("/api/v1/productos").json()["total"] == 1

    respuesta = _baja(cliente, plato["id"])

    assert respuesta.status_code == 200
    assert respuesta.json() == plato | {"estado": "DESHABILITADO"}
    assert cliente.get("/api/v1/productos").json()["total"] == 0


def test_dar_de_baja_plato_ya_deshabilitado_409(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Platos")
    plato = _crear_plato(cliente, seccion.id)
    _baja(cliente, plato["id"])

    respuesta = _baja(cliente, plato["id"])

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": "El producto ya está deshabilitado"}


def test_dar_de_baja_plato_inexistente_404(cliente: TestClient) -> None:
    respuesta = _baja(cliente, 999)

    assert respuesta.status_code == 404
    assert "detalle" in respuesta.json()


def test_dar_de_baja_plato_de_postre_404(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Carta")
    postre = _crear(cliente, ALTA_POSTRE, _datos(seccion.id, nombre="Flan")).json()

    respuesta = _baja(cliente, postre["id"])

    assert respuesta.status_code == 404
    assert cliente.get("/api/v1/productos").json()["total"] == 1


def test_dar_de_baja_plato_usado_por_otra_tabla_200(
    cliente: TestClient, fabrica_seccion, db
) -> None:
    seccion = fabrica_seccion("Platos")
    plato = _crear_plato(cliente, seccion.id)
    db.execute(
        text(
            "CREATE TABLE prueba_linea "
            "(id INTEGER PRIMARY KEY, producto_id INTEGER REFERENCES productos(id))"
        )
    )
    db.execute(
        text("INSERT INTO prueba_linea (id, producto_id) VALUES (1, :id)"), {"id": plato["id"]}
    )
    db.commit()

    respuesta = _baja(cliente, plato["id"])

    assert respuesta.status_code == 200
    assert db.execute(text("SELECT producto_id FROM prueba_linea")).all() == [(plato["id"],)]
    assert db.execute(text("SELECT count(*) FROM productos")).scalar() == 1


def test_dar_de_baja_plato_conserva_datos_e_imagen(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Platos")
    plato = _plato_con_imagen(cliente, seccion.id, descripcion="Con papas", etiquetas=["Casero"])

    _baja(cliente, plato["id"])

    consultado = cliente.get(f"{RUTA_PLATOS}/{plato['id']}").json()
    assert consultado == plato | {"estado": "DESHABILITADO"}
    assert _sirve(directorio_media, plato["imagen_url"]) == 200


def test_reactivar_plato_tras_la_baja_200(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Platos")
    plato = _crear_plato(cliente, seccion.id)
    _baja(cliente, plato["id"])

    respuesta = _modificar(cliente, plato["id"], _datos(seccion.id, estado="HABILITADO"))

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "HABILITADO"
    assert cliente.get("/api/v1/productos").json()["total"] == 1


# ---------------------------------------------------------------------------
# HU-M1-05-06: consultar, modificar y dar de baja un postre
# ---------------------------------------------------------------------------

RUTA_POSTRES = "/api/v1/postres"


def _crear_postre(cliente: TestClient, seccion_id: int, imagen: tuple | None = None, **cambios):
    respuesta = _crear(cliente, ALTA_POSTRE, _datos(seccion_id, nombre="Flan", **cambios), imagen)
    assert respuesta.status_code == 201
    return respuesta.json()


def _modificar_postre(
    cliente: TestClient, postre_id: int, datos: dict, imagen: tuple | None = None
):
    return _modificar(cliente, postre_id, datos, imagen, RUTA_POSTRES)


def _baja_postre(cliente: TestClient, postre_id: int):
    return _baja(cliente, postre_id, RUTA_POSTRES)


# CA 1: consultar y modificar los datos
def test_consultar_postre_existente(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Postres")
    postre = _crear_postre(cliente, seccion.id, descripcion="Con dulce", etiquetas=["Casero"])

    respuesta = cliente.get(f"{RUTA_POSTRES}/{postre['id']}")

    assert respuesta.status_code == 200
    assert respuesta.json() == postre
    assert postre["categoria"] == "POSTRE"


def test_modificar_postre_datos_validos(cliente: TestClient, fabrica_seccion) -> None:
    origen = fabrica_seccion("Postres", 1)
    destino = fabrica_seccion("Dulces", 2)
    postre = _crear_postre(cliente, origen.id)

    respuesta = _modificar_postre(
        cliente,
        postre["id"],
        _datos(destino.id, nombre="  Budín ", precio="1200", descripcion="Con caramelo"),
    )

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["id"] == postre["id"]
    assert cuerpo["nombre"] == "Budín"
    assert cuerpo["precio"] == "1200.00"
    assert cuerpo["categoria"] == "POSTRE"
    assert cuerpo["seccion"] == {"id": destino.id, "nombre": "Dulces"}
    assert cliente.get(f"{RUTA_POSTRES}/{postre['id']}").json() == cuerpo


# CA 2: ingredientes, etiquetas e imagen
def test_modificar_postre_ingredientes_etiquetas_e_imagen(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Postres")
    postre = _crear_postre(
        cliente, seccion.id, ("foto.jpg", _imagen(), "image/jpeg"), etiquetas=["Casero"]
    )

    respuesta = _modificar_postre(
        cliente,
        postre["id"],
        _datos(seccion.id, nombre="Flan", ingredientes=["Leche", "Huevo"], etiquetas=["Sin TACC"]),
        ("nueva.png", _imagen("PNG"), "image/png"),
    )

    cuerpo = respuesta.json()
    assert respuesta.status_code == 200
    assert cuerpo["ingredientes"] == ["Leche", "Huevo"]
    assert cuerpo["etiquetas"] == ["Sin TACC"]
    assert cuerpo["imagen_url"] != postre["imagen_url"]
    assert _sirve(directorio_media, cuerpo["imagen_url"]) == 200
    assert _sirve(directorio_media, postre["imagen_url"]) == 404


# CA 3: las reglas del alta
def test_modificar_postre_nombre_duplicado_409(cliente: TestClient, fabrica_seccion, db) -> None:
    seccion = fabrica_seccion("Postres")
    flan = _crear_postre(cliente, seccion.id)
    budin = _crear(cliente, ALTA_POSTRE, _datos(seccion.id, nombre="Budín")).json()
    _deshabilitar(db, budin["id"])

    respuesta = _modificar_postre(cliente, flan["id"], _datos(seccion.id, nombre=" budín "))

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": "El postre ya está registrado"}
    assert cliente.get(f"{RUTA_POSTRES}/{flan['id']}").json() == flan


def test_modificar_postre_mismo_nombre_que_plato_200(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Carta")
    _crear_plato(cliente, seccion.id, nombre="Milanesa")
    postre = _crear_postre(cliente, seccion.id)

    respuesta = _modificar_postre(cliente, postre["id"], _datos(seccion.id, nombre="Milanesa"))

    assert respuesta.status_code == 200


@pytest.mark.parametrize(
    "cambios",
    [{"precio": "0"}, {"precio": "mil"}, {"ingredientes": []}],
    ids=["precio-cero", "precio-texto", "sin-ingredientes"],
)
def test_modificar_postre_datos_invalidos_422(
    cliente: TestClient, fabrica_seccion, cambios: dict
) -> None:
    seccion = fabrica_seccion("Postres")
    postre = _crear_postre(cliente, seccion.id)

    respuesta = _modificar_postre(cliente, postre["id"], _datos(seccion.id, **cambios))

    assert respuesta.status_code == 422
    assert cliente.get(f"{RUTA_POSTRES}/{postre['id']}").json() == postre


# CA 4: las facturas conservan su identidad (S18)
def test_modificar_postre_conserva_identidad(cliente: TestClient, fabrica_seccion, db) -> None:
    seccion = fabrica_seccion("Postres")
    postre = _crear_postre(cliente, seccion.id)
    db.execute(
        text(
            "CREATE TABLE prueba_linea "
            "(id INTEGER PRIMARY KEY, producto_id INTEGER REFERENCES productos(id))"
        )
    )
    db.execute(
        text("INSERT INTO prueba_linea (id, producto_id) VALUES (1, :id)"), {"id": postre["id"]}
    )
    db.commit()

    datos = _datos(seccion.id, nombre="Flan", precio="5")
    respuesta = _modificar_postre(cliente, postre["id"], datos)

    assert respuesta.status_code == 200
    assert respuesta.json()["id"] == postre["id"]
    assert db.execute(text("SELECT producto_id FROM prueba_linea")).all() == [(postre["id"],)]
    assert db.execute(text("SELECT count(*) FROM productos")).scalar() == 1


# CA 5: reactivar
def test_modificar_postre_reactivar_200(cliente: TestClient, fabrica_seccion, db) -> None:
    seccion = fabrica_seccion("Postres")
    postre = _crear_postre(cliente, seccion.id)
    _deshabilitar(db, postre["id"])
    assert cliente.get(RUTA_PRODUCTOS).json()["total"] == 0

    respuesta = _modificar_postre(
        cliente, postre["id"], _datos(seccion.id, nombre="Flan", estado="HABILITADO")
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "HABILITADO"
    assert cliente.get(RUTA_PRODUCTOS).json()["total"] == 1


# HU-M1-06: dar de baja un postre
def test_dar_de_baja_postre_200(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Postres")
    postre = _crear_postre(cliente, seccion.id)
    assert cliente.get(RUTA_PRODUCTOS).json()["total"] == 1

    respuesta = _baja_postre(cliente, postre["id"])

    assert respuesta.status_code == 200
    assert respuesta.json() == postre | {"estado": "DESHABILITADO"}
    assert cliente.get(RUTA_PRODUCTOS).json()["total"] == 0


def test_dar_de_baja_postre_ya_deshabilitado_409(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Postres")
    postre = _crear_postre(cliente, seccion.id)
    _baja_postre(cliente, postre["id"])

    respuesta = _baja_postre(cliente, postre["id"])

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": "El producto ya está deshabilitado"}


def test_dar_de_baja_postre_conserva_datos_e_imagen(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Postres")
    postre = _crear_postre(
        cliente, seccion.id, ("foto.jpg", _imagen(), "image/jpeg"), etiquetas=["Casero"]
    )

    _baja_postre(cliente, postre["id"])

    consultado = cliente.get(f"{RUTA_POSTRES}/{postre['id']}").json()
    assert consultado == postre | {"estado": "DESHABILITADO"}
    assert _sirve(directorio_media, postre["imagen_url"]) == 200


def test_dar_de_baja_postre_usado_por_otra_tabla_200(
    cliente: TestClient, fabrica_seccion, db
) -> None:
    seccion = fabrica_seccion("Postres")
    postre = _crear_postre(cliente, seccion.id)
    db.execute(
        text(
            "CREATE TABLE prueba_linea "
            "(id INTEGER PRIMARY KEY, producto_id INTEGER REFERENCES productos(id))"
        )
    )
    db.execute(
        text("INSERT INTO prueba_linea (id, producto_id) VALUES (1, :id)"), {"id": postre["id"]}
    )
    db.commit()

    respuesta = _baja_postre(cliente, postre["id"])

    assert respuesta.status_code == 200
    assert db.execute(text("SELECT producto_id FROM prueba_linea")).all() == [(postre["id"],)]
    assert db.execute(text("SELECT count(*) FROM productos")).scalar() == 1


def test_reactivar_postre_tras_la_baja_200(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Postres")
    postre = _crear_postre(cliente, seccion.id)
    _baja_postre(cliente, postre["id"])
    assert cliente.get(f"{RUTA_PRODUCTOS}?estado=DESHABILITADO").json()["total"] == 1

    respuesta = _modificar_postre(
        cliente, postre["id"], _datos(seccion.id, nombre="Flan", estado="HABILITADO")
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "HABILITADO"
    assert cliente.get(RUTA_PRODUCTOS).json()["total"] == 1


# Aislamiento por categoria (E5, S34)
def test_postre_inexistente_404_en_las_tres_operaciones(
    cliente: TestClient, fabrica_seccion
) -> None:
    seccion = fabrica_seccion("Postres")

    assert cliente.get(f"{RUTA_POSTRES}/999").status_code == 404
    assert _modificar_postre(cliente, 999, _datos(seccion.id)).status_code == 404
    assert _baja_postre(cliente, 999).status_code == 404


@pytest.mark.parametrize("operacion", ["consultar", "modificar", "baja"])
def test_postre_con_id_de_plato_404(cliente: TestClient, fabrica_seccion, operacion: str) -> None:
    seccion = fabrica_seccion("Carta")
    plato = _crear_plato(cliente, seccion.id, nombre="Milanesa")
    acciones = {
        "consultar": lambda: cliente.get(f"{RUTA_POSTRES}/{plato['id']}"),
        "modificar": lambda: _modificar_postre(
            cliente, plato["id"], _datos(seccion.id, nombre="Otro")
        ),
        "baja": lambda: _baja_postre(cliente, plato["id"]),
    }

    respuesta = acciones[operacion]()

    assert respuesta.status_code == 404
    assert cliente.get(f"{RUTA_PLATOS}/{plato['id']}").json() == plato


# ---------------------------------------------------------------------------
# HU-M1-07-08-09: consultar, modificar y dar de baja una bebida
# ---------------------------------------------------------------------------

RUTA_BEBIDAS = "/api/v1/bebidas"


def _crear_bebida(cliente: TestClient, seccion_id: int, imagen: tuple | None = None, **cambios):
    respuesta = _crear(
        cliente, ALTA_BEBIDA, _datos(seccion_id, nombre="Limonada", **cambios), imagen
    )
    assert respuesta.status_code == 201
    return respuesta.json()


def _modificar_bebida(
    cliente: TestClient, bebida_id: int, datos: dict, imagen: tuple | None = None
):
    return _modificar(cliente, bebida_id, datos, imagen, RUTA_BEBIDAS)


def _baja_bebida(cliente: TestClient, bebida_id: int):
    return _baja(cliente, bebida_id, RUTA_BEBIDAS)


def _tabla_de_prueba_con(db, producto_id: int) -> None:
    db.execute(
        text(
            "CREATE TABLE prueba_linea "
            "(id INTEGER PRIMARY KEY, producto_id INTEGER REFERENCES productos(id))"
        )
    )
    db.execute(
        text("INSERT INTO prueba_linea (id, producto_id) VALUES (1, :id)"), {"id": producto_id}
    )
    db.commit()


# CA 1: consultar y modificar los datos
def test_consultar_bebida_existente(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Bebidas")
    bebida = _crear_bebida(cliente, seccion.id, descripcion="Con menta", etiquetas=["Casera"])

    respuesta = cliente.get(f"{RUTA_BEBIDAS}/{bebida['id']}")

    assert respuesta.status_code == 200
    assert respuesta.json() == bebida
    assert bebida["categoria"] == "BEBIDA"


def test_modificar_bebida_datos_validos(cliente: TestClient, fabrica_seccion) -> None:
    origen = fabrica_seccion("Bebidas", 1)
    destino = fabrica_seccion("Sin alcohol", 2)
    bebida = _crear_bebida(cliente, origen.id)

    respuesta = _modificar_bebida(
        cliente,
        bebida["id"],
        _datos(destino.id, nombre="  Agua ", precio="1200", descripcion="Con gas"),
    )

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["id"] == bebida["id"]
    assert cuerpo["nombre"] == "Agua"
    assert cuerpo["precio"] == "1200.00"
    assert cuerpo["categoria"] == "BEBIDA"
    assert cuerpo["seccion"] == {"id": destino.id, "nombre": "Sin alcohol"}
    assert cliente.get(f"{RUTA_BEBIDAS}/{bebida['id']}").json() == cuerpo


# CA 2: ingredientes, etiquetas e imagen
def test_modificar_bebida_ingredientes_etiquetas_e_imagen(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Bebidas")
    bebida = _crear_bebida(
        cliente, seccion.id, ("foto.jpg", _imagen(), "image/jpeg"), etiquetas=["Casera"]
    )

    respuesta = _modificar_bebida(
        cliente,
        bebida["id"],
        _datos(
            seccion.id, nombre="Limonada", ingredientes=["Limón", "Menta"], etiquetas=["Sin TACC"]
        ),
        ("nueva.png", _imagen("PNG"), "image/png"),
    )

    cuerpo = respuesta.json()
    assert respuesta.status_code == 200
    assert cuerpo["ingredientes"] == ["Limón", "Menta"]
    assert cuerpo["etiquetas"] == ["Sin TACC"]
    assert cuerpo["imagen_url"] != bebida["imagen_url"]
    assert _sirve(directorio_media, cuerpo["imagen_url"]) == 200
    assert _sirve(directorio_media, bebida["imagen_url"]) == 404


# S44: los ingredientes son opcionales, también al modificar
@pytest.mark.parametrize("ingredientes", [None, []], ids=["ausentes", "vacios"])
def test_modificar_bebida_quita_todos_los_ingredientes_200(
    cliente: TestClient, fabrica_seccion, ingredientes
) -> None:
    seccion = fabrica_seccion("Bebidas")
    bebida = _crear_bebida(cliente, seccion.id, ingredientes=["Limón", "Azúcar"])
    datos = _datos(seccion.id, nombre="Limonada")
    del datos["ingredientes"]
    if ingredientes is not None:
        datos["ingredientes"] = ingredientes

    respuesta = _modificar_bebida(cliente, bebida["id"], datos)

    assert respuesta.status_code == 200
    assert respuesta.json()["ingredientes"] == []
    assert cliente.get(f"{RUTA_BEBIDAS}/{bebida['id']}").json()["ingredientes"] == []


# CA 3: las reglas del alta
def test_modificar_bebida_nombre_duplicado_409(cliente: TestClient, fabrica_seccion, db) -> None:
    seccion = fabrica_seccion("Bebidas")
    limonada = _crear_bebida(cliente, seccion.id)
    agua = _crear(cliente, ALTA_BEBIDA, _datos(seccion.id, nombre="Agua")).json()
    _deshabilitar(db, agua["id"])

    respuesta = _modificar_bebida(cliente, limonada["id"], _datos(seccion.id, nombre=" agua "))

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": "La bebida ya está registrada"}
    assert cliente.get(f"{RUTA_BEBIDAS}/{limonada['id']}").json() == limonada


def test_modificar_bebida_mismo_nombre_que_plato_200(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Carta")
    _crear_plato(cliente, seccion.id, nombre="Milanesa")
    bebida = _crear_bebida(cliente, seccion.id)

    respuesta = _modificar_bebida(cliente, bebida["id"], _datos(seccion.id, nombre="Milanesa"))

    assert respuesta.status_code == 200


@pytest.mark.parametrize(
    "cambios",
    [{"precio": "0"}, {"precio": "mil"}, {"ingredientes": ["Limón", " limón "]}],
    ids=["precio-cero", "precio-texto", "ingredientes-repetidos"],
)
def test_modificar_bebida_datos_invalidos_422(
    cliente: TestClient, fabrica_seccion, cambios: dict
) -> None:
    seccion = fabrica_seccion("Bebidas")
    bebida = _crear_bebida(cliente, seccion.id)

    respuesta = _modificar_bebida(cliente, bebida["id"], _datos(seccion.id, **cambios))

    assert respuesta.status_code == 422
    assert cliente.get(f"{RUTA_BEBIDAS}/{bebida['id']}").json() == bebida


# CA 4: las facturas conservan su identidad (S18)
def test_modificar_bebida_conserva_identidad(cliente: TestClient, fabrica_seccion, db) -> None:
    seccion = fabrica_seccion("Bebidas")
    bebida = _crear_bebida(cliente, seccion.id)
    _tabla_de_prueba_con(db, bebida["id"])

    respuesta = _modificar_bebida(
        cliente, bebida["id"], _datos(seccion.id, nombre="Limonada", precio="5")
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["id"] == bebida["id"]
    assert db.execute(text("SELECT producto_id FROM prueba_linea")).all() == [(bebida["id"],)]
    assert db.execute(text("SELECT count(*) FROM productos")).scalar() == 1


# CA 5: reactivar
def test_modificar_bebida_reactivar_200(cliente: TestClient, fabrica_seccion, db) -> None:
    seccion = fabrica_seccion("Bebidas")
    bebida = _crear_bebida(cliente, seccion.id)
    _deshabilitar(db, bebida["id"])
    assert cliente.get(RUTA_PRODUCTOS).json()["total"] == 0

    respuesta = _modificar_bebida(
        cliente, bebida["id"], _datos(seccion.id, nombre="Limonada", estado="HABILITADO")
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "HABILITADO"
    assert cliente.get(RUTA_PRODUCTOS).json()["total"] == 1


# HU-M1-09: dar de baja una bebida
def test_dar_de_baja_bebida_200(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Bebidas")
    bebida = _crear_bebida(cliente, seccion.id)
    assert cliente.get(RUTA_PRODUCTOS).json()["total"] == 1

    respuesta = _baja_bebida(cliente, bebida["id"])

    assert respuesta.status_code == 200
    assert respuesta.json() == bebida | {"estado": "DESHABILITADO"}
    assert cliente.get(RUTA_PRODUCTOS).json()["total"] == 0


def test_dar_de_baja_bebida_ya_deshabilitada_409(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Bebidas")
    bebida = _crear_bebida(cliente, seccion.id)
    _baja_bebida(cliente, bebida["id"])

    respuesta = _baja_bebida(cliente, bebida["id"])

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": "El producto ya está deshabilitado"}


def test_dar_de_baja_bebida_conserva_datos_e_imagen(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Bebidas")
    bebida = _crear_bebida(
        cliente, seccion.id, ("foto.jpg", _imagen(), "image/jpeg"), etiquetas=["Casera"]
    )

    _baja_bebida(cliente, bebida["id"])

    consultada = cliente.get(f"{RUTA_BEBIDAS}/{bebida['id']}").json()
    assert consultada == bebida | {"estado": "DESHABILITADO"}
    assert _sirve(directorio_media, bebida["imagen_url"]) == 200


def test_dar_de_baja_bebida_usada_por_otra_tabla_200(
    cliente: TestClient, fabrica_seccion, db
) -> None:
    seccion = fabrica_seccion("Bebidas")
    bebida = _crear_bebida(cliente, seccion.id)
    _tabla_de_prueba_con(db, bebida["id"])

    respuesta = _baja_bebida(cliente, bebida["id"])

    assert respuesta.status_code == 200
    assert db.execute(text("SELECT producto_id FROM prueba_linea")).all() == [(bebida["id"],)]
    assert db.execute(text("SELECT count(*) FROM productos")).scalar() == 1


def test_reactivar_bebida_tras_la_baja_200(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Bebidas")
    bebida = _crear_bebida(cliente, seccion.id)
    _baja_bebida(cliente, bebida["id"])
    assert cliente.get(f"{RUTA_PRODUCTOS}?estado=DESHABILITADO").json()["total"] == 1

    respuesta = _modificar_bebida(
        cliente, bebida["id"], _datos(seccion.id, nombre="Limonada", estado="HABILITADO")
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "HABILITADO"
    assert cliente.get(RUTA_PRODUCTOS).json()["total"] == 1


# Aislamiento por categoria (E5, S34)
def test_bebida_inexistente_404_en_las_tres_operaciones(
    cliente: TestClient, fabrica_seccion
) -> None:
    seccion = fabrica_seccion("Bebidas")

    assert cliente.get(f"{RUTA_BEBIDAS}/999").status_code == 404
    assert _modificar_bebida(cliente, 999, _datos(seccion.id)).status_code == 404
    assert _baja_bebida(cliente, 999).status_code == 404


@pytest.mark.parametrize("operacion", ["consultar", "modificar", "baja"])
def test_bebida_con_id_de_postre_404(cliente: TestClient, fabrica_seccion, operacion: str) -> None:
    seccion = fabrica_seccion("Carta")
    postre = _crear_postre(cliente, seccion.id)
    acciones = {
        "consultar": lambda: cliente.get(f"{RUTA_BEBIDAS}/{postre['id']}"),
        "modificar": lambda: _modificar_bebida(
            cliente, postre["id"], _datos(seccion.id, nombre="Otro")
        ),
        "baja": lambda: _baja_bebida(cliente, postre["id"]),
    }

    respuesta = acciones[operacion]()

    assert respuesta.status_code == 404
    assert cliente.get(f"{RUTA_POSTRES}/{postre['id']}").json() == postre


# HU-M1-11 y HU-M1-12: consultar, modificar y dar de baja una sección
def _seccion_con(fabrica_seccion, fabrica_producto, nombres: list[str], orden: int = 1):
    seccion = fabrica_seccion("Postres", orden)
    for nombre in nombres:
        fabrica_producto(seccion, nombre)
    return seccion


def _modificar_seccion(cliente: TestClient, seccion_id: int, **cambios):
    cuerpo = {"nombre": "Postres", "orden": 1} | cambios
    return cliente.put(f"{RUTA}/{seccion_id}", json=cuerpo)


def _productos_de_seccion(db, seccion_id: int) -> list[str]:
    db.expire_all()
    return sorted(p.nombre for p in db.get(Seccion, seccion_id).productos)


def test_obtener_seccion_con_productos(cliente: TestClient, fabrica_seccion, fabrica_producto):
    seccion = fabrica_seccion("Postres", 2)
    fabrica_producto(seccion, "Flan")
    fabrica_producto(seccion, "Helado", Estado.DESHABILITADO)

    respuesta = cliente.get(f"{RUTA}/{seccion.id}")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert (cuerpo["nombre"], cuerpo["orden"], cuerpo["estado"]) == ("Postres", 2, "HABILITADO")
    assert [p["nombre"] for p in cuerpo["productos"]] == ["Flan", "Helado"]
    assert cuerpo["productos_habilitados"] == 1


@pytest.mark.parametrize(
    "metodo, sufijo",
    [("get", ""), ("put", ""), ("post", "/baja")],
)
def test_seccion_inexistente_responde_404(cliente: TestClient, metodo: str, sufijo: str) -> None:
    solicitud = {"json": {"nombre": "Postres", "orden": 1}} if metodo == "put" else {}

    respuesta = getattr(cliente, metodo)(f"{RUTA}/999{sufijo}", **solicitud)

    assert respuesta.status_code == 404
    assert "999" in respuesta.json()["detalle"]


def test_modificar_seccion_nombre_y_orden_200(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Postres", 2)

    respuesta = _modificar_seccion(cliente, seccion.id, nombre="Dulces", orden=5)

    assert respuesta.status_code == 200
    assert (respuesta.json()["nombre"], respuesta.json()["orden"]) == ("Dulces", 5)
    items = cliente.get(RUTA).json()["items"]
    assert [(s["nombre"], s["orden"]) for s in items] == [("Dulces", 5)]


@pytest.mark.parametrize(
    "cambios",
    [{"nombre": "x" * 51}, {"orden": 0}, {"orden": "3"}],
)
@pytest.mark.parametrize("existe", [True, False])
def test_modificar_seccion_con_valores_invalidos_responde_422(
    cliente: TestClient, fabrica_seccion, db, cambios: dict, existe: bool
) -> None:
    seccion = fabrica_seccion("Postres", 2)
    seccion_id = seccion.id if existe else 999

    respuesta = _modificar_seccion(cliente, seccion_id, **cambios)

    assert respuesta.status_code == 422
    assert next(iter(cambios)) in respuesta.json()["detalle"]
    assert db.get(Seccion, seccion.id).nombre == "Postres"


def test_modificar_seccion_con_nombre_de_otra_responde_409(
    cliente: TestClient, fabrica_seccion
) -> None:
    fabrica_seccion("Postres", 1)
    entradas = fabrica_seccion("Entradas", 2)

    respuesta = _modificar_seccion(cliente, entradas.id, nombre=" postres ", orden=2)

    assert respuesta.status_code == 409
    assert "ya existe" in respuesta.json()["detalle"]
    assert cliente.get(f"{RUTA}/{entradas.id}").json()["nombre"] == "Entradas"


def test_modificar_seccion_solo_la_capitalizacion_responde_200(
    cliente: TestClient, fabrica_seccion
) -> None:
    seccion = fabrica_seccion("Postres", 1)

    respuesta = _modificar_seccion(cliente, seccion.id, nombre="POSTRES")

    assert respuesta.status_code == 200
    assert respuesta.json()["nombre"] == "POSTRES"


def test_modificar_seccion_con_orden_ocupado_responde_409(
    cliente: TestClient, fabrica_seccion, db
) -> None:
    fabrica_seccion("Entradas", 1)
    postres = fabrica_seccion("Postres", 2)

    respuesta = _modificar_seccion(cliente, postres.id, orden=1)

    assert respuesta.status_code == 409
    assert "ocupada" in respuesta.json()["detalle"]
    assert db.get(Seccion, postres.id).orden == 2


def test_modificar_seccion_deshabilitada_acepta_orden_de_otra_deshabilitada(
    cliente: TestClient, fabrica_seccion
) -> None:
    fabrica_seccion("Entradas", 3, Estado.DESHABILITADO)
    postres = fabrica_seccion("Postres", 4, Estado.DESHABILITADO)

    respuesta = _modificar_seccion(cliente, postres.id, orden=3)

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "DESHABILITADO"


def test_modificar_seccion_sin_cambios_responde_200(cliente: TestClient, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Postres", 1)

    respuesta = _modificar_seccion(cliente, seccion.id)

    assert respuesta.status_code == 200
    assert (respuesta.json()["nombre"], respuesta.json()["orden"]) == ("Postres", 1)


def test_modificar_seccion_agrega_productos_con_confirmacion(
    cliente: TestClient, fabrica_seccion, fabrica_producto, db
) -> None:
    postres = fabrica_seccion("Postres", 1)
    otra = fabrica_seccion("Entradas", 2)
    flan = fabrica_producto(otra, "Flan")
    helado = fabrica_producto(otra, "Helado")

    respuesta = _modificar_seccion(
        cliente, postres.id, producto_ids=[flan.id, helado.id], confirmar_traslado=True
    )

    assert respuesta.status_code == 200
    assert [p["nombre"] for p in respuesta.json()["productos"]] == ["Flan", "Helado"]
    secciones = {
        p["nombre"]: p["seccion"]["id"] for p in cliente.get("/api/v1/productos").json()["items"]
    }
    assert secciones == {"Flan": postres.id, "Helado": postres.id}


def test_modificar_seccion_sin_confirmar_traslado_responde_409(
    cliente: TestClient, fabrica_seccion, fabrica_producto, db
) -> None:
    postres = fabrica_seccion("Postres", 1)
    entradas = fabrica_seccion("Entradas", 2)
    flan = fabrica_producto(entradas, "Flan")

    respuesta = _modificar_seccion(cliente, postres.id, producto_ids=[flan.id])

    assert respuesta.status_code == 409
    assert "Flan" in respuesta.json()["detalle"]
    assert "Entradas" in respuesta.json()["detalle"]
    assert _productos_de_seccion(db, entradas.id) == ["Flan"]


def test_modificar_seccion_con_producto_deshabilitado_responde_409(
    cliente: TestClient, fabrica_seccion, fabrica_producto
) -> None:
    postres = fabrica_seccion("Postres", 1)
    flan = fabrica_producto(fabrica_seccion("Entradas", 2), "Flan", Estado.DESHABILITADO)

    respuesta = _modificar_seccion(
        cliente, postres.id, producto_ids=[flan.id], confirmar_traslado=True
    )

    assert respuesta.status_code == 409
    assert "deshabilitado" in respuesta.json()["detalle"]


def test_modificar_seccion_agregando_a_una_deshabilitada_responde_409(
    cliente: TestClient, fabrica_seccion, fabrica_producto, db
) -> None:
    postres = fabrica_seccion("Postres", 1, Estado.DESHABILITADO)
    entradas = fabrica_seccion("Entradas", 2)
    flan = fabrica_producto(entradas, "Flan")

    respuesta = _modificar_seccion(
        cliente, postres.id, producto_ids=[flan.id], confirmar_traslado=True
    )

    assert respuesta.status_code == 409
    assert "Postres está deshabilitada" in respuesta.json()["detalle"]
    assert _productos_de_seccion(db, entradas.id) == ["Flan"]


def test_modificar_seccion_ignora_un_producto_ya_presente(
    cliente: TestClient, fabrica_seccion, fabrica_producto, db
) -> None:
    postres = fabrica_seccion("Postres", 1)
    flan = fabrica_producto(postres, "Flan", Estado.DESHABILITADO)

    respuesta = _modificar_seccion(cliente, postres.id, producto_ids=[flan.id])

    assert respuesta.status_code == 200
    assert _productos_de_seccion(db, postres.id) == ["Flan"]


def test_modificar_seccion_con_falla_parcial_no_cambia_nada(
    cliente: TestClient, fabrica_seccion, fabrica_producto, db
) -> None:
    postres = fabrica_seccion("Postres", 1)
    entradas = fabrica_seccion("Entradas", 2)
    flan = fabrica_producto(entradas, "Flan")

    respuesta = _modificar_seccion(
        cliente, postres.id, nombre="Dulces", producto_ids=[flan.id, 999], confirmar_traslado=True
    )

    assert respuesta.status_code == 404
    assert db.get(Seccion, postres.id).nombre == "Postres"
    assert _productos_de_seccion(db, entradas.id) == ["Flan"]


def test_modificar_seccion_con_producto_ids_vacio_conserva_los_productos(
    cliente: TestClient, fabrica_seccion, fabrica_producto, db
) -> None:
    postres = _seccion_con(fabrica_seccion, fabrica_producto, ["Flan", "Helado"])

    respuesta = _modificar_seccion(cliente, postres.id, producto_ids=[])

    assert respuesta.status_code == 200
    assert _productos_de_seccion(db, postres.id) == ["Flan", "Helado"]


def test_reactivar_seccion_responde_200_y_vuelve_a_la_carta(
    cliente: TestClient, fabrica_seccion, fabrica_producto
) -> None:
    postres = fabrica_seccion("Postres", 1, Estado.DESHABILITADO)
    fabrica_producto(postres, "Flan")

    respuesta = _modificar_seccion(cliente, postres.id, estado="HABILITADO")

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "HABILITADO"
    habilitadas = cliente.get(RUTA, params={"estado": "HABILITADO"}).json()["items"]
    assert [(s["nombre"], s["productos_habilitados"]) for s in habilitadas] == [("Postres", 1)]


def test_reactivar_seccion_con_orden_ocupado_responde_409_y_sigue_deshabilitada(
    cliente: TestClient, fabrica_seccion
) -> None:
    fabrica_seccion("Entradas", 2)
    postres = fabrica_seccion("Postres", 2, Estado.DESHABILITADO)

    respuesta = _modificar_seccion(cliente, postres.id, orden=2, estado="HABILITADO")

    assert respuesta.status_code == 409
    assert "ocupada" in respuesta.json()["detalle"]
    assert cliente.get(f"{RUTA}/{postres.id}").json()["estado"] == "DESHABILITADO"


def test_reactivar_seccion_con_orden_libre_responde_200(
    cliente: TestClient, fabrica_seccion
) -> None:
    fabrica_seccion("Entradas", 2)
    postres = fabrica_seccion("Postres", 2, Estado.DESHABILITADO)

    respuesta = _modificar_seccion(cliente, postres.id, orden=3, estado="HABILITADO")

    assert respuesta.status_code == 200
    assert (respuesta.json()["orden"], respuesta.json()["estado"]) == (3, "HABILITADO")


def test_dar_de_baja_seccion_200(cliente: TestClient, fabrica_seccion) -> None:
    postres = fabrica_seccion("Postres", 1)

    respuesta = cliente.post(f"{RUTA}/{postres.id}/baja")

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "DESHABILITADO"
    assert cliente.get(RUTA, params={"estado": "HABILITADO"}).json()["items"] == []


def test_dar_de_baja_seccion_conserva_el_estado_y_la_seccion_de_sus_productos(
    cliente: TestClient, fabrica_seccion, fabrica_producto
) -> None:
    postres = fabrica_seccion("Postres", 1)
    fabrica_producto(postres, "Flan")

    cliente.post(f"{RUTA}/{postres.id}/baja")

    producto = cliente.get("/api/v1/productos").json()["items"][0]
    assert (producto["estado"], producto["seccion"]["id"]) == ("HABILITADO", postres.id)
    reactivada = _modificar_seccion(cliente, postres.id, estado="HABILITADO").json()
    assert [p["nombre"] for p in reactivada["productos"]] == ["Flan"]
    assert reactivada["productos_habilitados"] == 1


def test_dar_de_baja_seccion_ya_deshabilitada_responde_409(
    cliente: TestClient, fabrica_seccion
) -> None:
    postres = fabrica_seccion("Postres", 1, Estado.DESHABILITADO)

    respuesta = cliente.post(f"{RUTA}/{postres.id}/baja")

    assert respuesta.status_code == 409
    assert "ya está deshabilitada" in respuesta.json()["detalle"]


def test_listar_secciones_cuenta_los_productos_habilitados(
    cliente: TestClient, fabrica_seccion, fabrica_producto
) -> None:
    postres = fabrica_seccion("Postres", 1)
    fabrica_producto(postres, "Flan")
    fabrica_producto(postres, "Helado")
    fabrica_producto(postres, "Torta", Estado.DESHABILITADO)

    item = cliente.get(RUTA).json()["items"][0]

    assert (item["cantidad_productos"], item["productos_habilitados"]) == (3, 2)


RUTA_CARTA = "/api/v1/carta"


def _seccion_carta(respuesta, nombre: str) -> dict:
    return next(s for s in respuesta.json()["items"] if s["nombre"] == nombre)


# HU-M1-14 CA 1
def test_listar_carta_ordena_secciones_y_productos_con_los_campos_de_s81(
    cliente: TestClient, db, fabrica_seccion, fabrica_producto
) -> None:
    postres = fabrica_seccion("Postres", 2)
    principales = fabrica_seccion("Principales", 1)
    fabrica_producto(postres, "Flan", categoria=Categoria.POSTRE)
    fabrica_producto(principales, "Milanesa", categoria=Categoria.PLATO)
    agua = fabrica_producto(principales, "Agua", categoria=Categoria.BEBIDA)
    agua.imagen = "agua.jpg"
    agua.descripcion = "Sin gas"
    agua.etiquetas = ["fría"]
    db.commit()

    respuesta = cliente.get(RUTA_CARTA)

    cuerpo = respuesta.json()
    assert respuesta.status_code == 200
    assert [s["nombre"] for s in cuerpo["items"]] == ["Principales", "Postres"]
    assert [p["nombre"] for p in cuerpo["items"][0]["productos"]] == ["Agua", "Milanesa"]
    assert cuerpo["items"][0]["productos"][0] == {
        "id": agua.id,
        "nombre": "Agua",
        "categoria": "BEBIDA",
        "precio": "1500.00",
        "descripcion": "Sin gas",
        "etiquetas": ["fría"],
        "imagen_url": "/media/agua.jpg",
        "estado": "HABILITADO",
    }
    assert cuerpo["items"][0]["productos"][1]["imagen_url"] is None
    assert set(cuerpo["items"][0]) == {"id", "nombre", "orden", "estado", "productos"}
    assert (cuerpo["total"], cuerpo["limit"], cuerpo["offset"]) == (2, 50, 0)


# HU-M1-14 CA 2 y estado inválido
def test_listar_carta_sin_estado_equivale_a_habilitado(
    cliente: TestClient, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion("Postres", 1)
    fabrica_producto(seccion, "Flan")
    fabrica_producto(seccion, "Helado", Estado.DESHABILITADO)

    sin_estado = cliente.get(RUTA_CARTA).json()
    habilitados = cliente.get(RUTA_CARTA, params={"estado": "HABILITADO"}).json()

    assert sin_estado == habilitados
    assert [p["nombre"] for p in sin_estado["items"][0]["productos"]] == ["Flan"]


@pytest.mark.parametrize(
    "params",
    [
        {"estado": "ABIERTO"},
        {"estado": "habilitado"},
        {"limit": 0},
        {"limit": 101},
        {"offset": -1},
    ],
)
def test_listar_carta_con_parametros_invalidos_responde_422(
    cliente: TestClient, params: dict
) -> None:
    respuesta = cliente.get(RUTA_CARTA, params=params)

    assert respuesta.status_code == 422
    assert "detalle" in respuesta.json()


# HU-M1-14 CA 3
def test_listar_carta_habilitados_oculta_secciones_sin_productos_habilitados(
    cliente: TestClient, fabrica_seccion, fabrica_producto
) -> None:
    fabrica_seccion("Vacía", 1)
    fabrica_producto(fabrica_seccion("De baja", 2), "Helado", Estado.DESHABILITADO)
    fabrica_producto(fabrica_seccion("Cerrada", 3, Estado.DESHABILITADO), "Flan")
    fabrica_producto(fabrica_seccion("Visible", 4), "Agua")

    cuerpo = cliente.get(RUTA_CARTA).json()

    assert [s["nombre"] for s in cuerpo["items"]] == ["Visible"]
    assert cuerpo["total"] == 1


# HU-M1-14 CA 4
def test_listar_carta_deshabilitados_muestra_solo_lo_dado_de_baja(
    cliente: TestClient, fabrica_seccion, fabrica_producto
) -> None:
    con_baja = fabrica_seccion("Con baja", 1)
    fabrica_producto(con_baja, "Flan")
    fabrica_producto(con_baja, "Helado", Estado.DESHABILITADO)
    fabrica_producto(fabrica_seccion("Sin bajas", 2), "Café")
    cerrada = fabrica_seccion("Cerrada", 3, Estado.DESHABILITADO)
    fabrica_producto(cerrada, "Té")

    cuerpo = cliente.get(RUTA_CARTA, params={"estado": "DESHABILITADO"}).json()

    assert [s["nombre"] for s in cuerpo["items"]] == ["Con baja", "Cerrada"]
    assert [p["nombre"] for p in cuerpo["items"][0]["productos"]] == ["Helado"]
    assert cuerpo["items"][0]["productos"][0]["estado"] == "DESHABILITADO"
    assert cuerpo["items"][1]["productos"] == []
    assert cuerpo["total"] == 2


# HU-M1-14 CA 4 (S83): sección deshabilitada con productos mixtos o sin productos
def test_listar_carta_deshabilitados_en_seccion_deshabilitada_solo_trae_los_de_baja(
    cliente: TestClient, fabrica_seccion, fabrica_producto
) -> None:
    mixta = fabrica_seccion("Mixta", 1, Estado.DESHABILITADO)
    fabrica_producto(mixta, "Flan")
    fabrica_producto(mixta, "Helado", Estado.DESHABILITADO)
    fabrica_seccion("Vacía", 2, Estado.DESHABILITADO)

    cuerpo = cliente.get(RUTA_CARTA, params={"estado": "DESHABILITADO"}).json()

    assert [s["nombre"] for s in cuerpo["items"]] == ["Mixta", "Vacía"]
    assert [p["nombre"] for p in cuerpo["items"][0]["productos"]] == ["Helado"]
    assert cuerpo["items"][1]["productos"] == []


# HU-M1-14 CA 5 y orden (S85)
def test_listar_carta_todos_trae_las_tres_secciones_con_su_estado(
    cliente: TestClient, fabrica_seccion, fabrica_producto
) -> None:
    con_baja = fabrica_seccion("Con baja", 1)
    fabrica_producto(con_baja, "Flan")
    fabrica_producto(con_baja, "Helado", Estado.DESHABILITADO)
    fabrica_seccion("Vacía", 2)
    fabrica_producto(fabrica_seccion("Cerrada", 3, Estado.DESHABILITADO), "Té")

    cuerpo = cliente.get(RUTA_CARTA, params={"estado": "TODOS"}).json()

    assert [s["nombre"] for s in cuerpo["items"]] == ["Con baja", "Vacía", "Cerrada"]
    assert [s["estado"] for s in cuerpo["items"]] == ["HABILITADO", "HABILITADO", "DESHABILITADO"]
    assert [(p["nombre"], p["estado"]) for p in cuerpo["items"][0]["productos"]] == [
        ("Flan", "HABILITADO"),
        ("Helado", "DESHABILITADO"),
    ]
    assert cuerpo["items"][1]["productos"] == []
    assert [(p["nombre"], p["estado"]) for p in cuerpo["items"][2]["productos"]] == [
        ("Té", "HABILITADO")
    ]
    assert cuerpo["total"] == 3


def test_listar_carta_desempata_por_nombre_y_por_id(
    cliente: TestClient, fabrica_seccion, fabrica_producto
) -> None:
    fabrica_seccion("Beta", 1, Estado.DESHABILITADO)
    fabrica_seccion("Alfa", 1, Estado.DESHABILITADO)
    seccion = fabrica_seccion("Mesa", 2)
    primero = fabrica_producto(seccion, "Flan", categoria=Categoria.POSTRE)
    segundo = fabrica_producto(seccion, "Flan", categoria=Categoria.PLATO)

    cuerpo = cliente.get(RUTA_CARTA, params={"estado": "TODOS"}).json()

    assert [s["nombre"] for s in cuerpo["items"]] == ["Alfa", "Beta", "Mesa"]
    assert [p["id"] for p in cuerpo["items"][2]["productos"]] == [primero.id, segundo.id]


# HU-M1-14 paginación (S80) y solo lectura
def test_listar_carta_pagina_las_secciones_con_el_total_completo(
    cliente: TestClient, fabrica_seccion, fabrica_producto
) -> None:
    for nombre, orden in [("A", 1), ("B", 2), ("C", 3)]:
        fabrica_producto(fabrica_seccion(nombre, orden), f"Plato {nombre}")

    primera = cliente.get(RUTA_CARTA, params={"limit": 2, "offset": 0}).json()
    segunda = cliente.get(RUTA_CARTA, params={"limit": 1, "offset": 1}).json()

    assert [s["nombre"] for s in primera["items"]] == ["A", "B"]
    assert (primera["total"], primera["limit"], primera["offset"]) == (3, 2, 0)
    assert [s["nombre"] for s in segunda["items"]] == ["B"]
    assert (segunda["total"], segunda["limit"], segunda["offset"]) == (3, 1, 1)


def test_listar_carta_no_modifica_los_datos(
    cliente: TestClient, fabrica_seccion, fabrica_producto
) -> None:
    fabrica_producto(fabrica_seccion("Postres", 1), "Flan")
    antes = (cliente.get("/api/v1/productos").json(), cliente.get("/api/v1/secciones").json())

    cliente.get(RUTA_CARTA, params={"estado": "TODOS"})

    despues = (cliente.get("/api/v1/productos").json(), cliente.get("/api/v1/secciones").json())
    assert despues == antes
