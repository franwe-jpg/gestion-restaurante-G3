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
    ],
    ids=["plato", "postre"],
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
        ({"ingredientes": []}, "ingredientes"),
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


@pytest.mark.parametrize("faltante", ["nombre", "seccion_id", "precio", "ingredientes"])
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


# CA 6: los ingredientes son obligatorios en postres
def test_crear_postre_sin_ingredientes_responde_422(cliente: TestClient, fabrica_seccion) -> None:
    datos = _datos(fabrica_seccion("Carta").id)
    del datos["ingredientes"]

    respuesta = _crear(cliente, ALTA_POSTRE, datos)

    assert respuesta.status_code == 422
    assert "ingredientes" in respuesta.json()["detalle"]


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
def _modificar(cliente: TestClient, plato_id: int, datos: dict, imagen: tuple | None = None):
    archivos = {"imagen": imagen} if imagen else None
    return cliente.put(
        f"{RUTA_PLATOS}/{plato_id}", data={"datos": json.dumps(datos)}, files=archivos
    )


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
def _baja(cliente: TestClient, plato_id: int):
    return cliente.post(f"{RUTA_PLATOS}/{plato_id}/baja")


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
