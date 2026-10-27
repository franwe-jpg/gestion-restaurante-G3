"""Pruebas HTTP del menu del dia: una por criterio de aceptacion (HU-M2-04, 05 y 06)."""

import io
import json
from pathlib import Path

import pillow_heif
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.main import montar_media
from app.shared.models import Categoria, Estado

RUTA = "/api/v1/menus-del-dia"
RUTA_PLATOS = "/api/v1/platos"


def _imagen(formato: str = "JPEG", tamano: tuple[int, int] = (8, 4)) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", tamano, "red").save(buffer, formato)
    return buffer.getvalue()


def _datos(seccion_id: int, **cambios) -> dict:
    base = {
        "nombre": "Guiso de lentejas",
        "seccion_id": seccion_id,
        "precio": "9900.00",
        "ingredientes": ["Lentejas"],
    }
    return base | cambios


def _crear(
    cliente: TestClient,
    seccion_id: int,
    imagen: tuple | None = None,
    **cambios,
):
    archivos = {"imagen": imagen} if imagen else None
    return cliente.post(
        RUTA, data={"datos": json.dumps(_datos(seccion_id, **cambios))}, files=archivos
    )


def _crear_ok(cliente: TestClient, seccion_id: int, imagen: tuple | None = None, **cambios):
    respuesta = _crear(cliente, seccion_id, imagen, **cambios)
    assert respuesta.status_code == 201
    return respuesta.json()


def _modificar(cliente: TestClient, menu_id: int, seccion_id: int, **cambios):
    imagen = cambios.pop("imagen", None)
    archivos = {"imagen": imagen} if imagen else None
    formulario = {"datos": json.dumps(_datos(seccion_id, **cambios))}
    return cliente.put(f"{RUTA}/{menu_id}", data=formulario, files=archivos)


# CA 1
def test_crear_menu_del_dia_responde_201_habilitado(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Principales")

    cuerpo = _crear_ok(cliente, seccion.id, nombre="  Guiso de lentejas ")

    assert cuerpo == {
        "id": 1,
        "nombre": "Guiso de lentejas",
        "categoria": "MENU_DEL_DIA",
        "precio": "9900.00",
        "ingredientes": ["Lentejas"],
        "descripcion": None,
        "etiquetas": [],
        "estado": "HABILITADO",
        "seccion": {"id": seccion.id, "nombre": "Principales"},
        "imagen_url": None,
    }


# CA 2
@pytest.mark.parametrize("campo", ["nombre", "precio", "ingredientes", "seccion_id"])
def test_crear_menu_del_dia_sin_un_obligatorio_responde_422(
    campo: str, cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion()
    datos = _datos(seccion.id)
    datos.pop(campo)

    respuesta = cliente.post(RUTA, data={"datos": json.dumps(datos)})

    assert respuesta.status_code == 422
    assert campo in respuesta.json()["detalle"]


# CA 3
def test_crear_menu_del_dia_con_nombre_repetido_responde_409(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion()
    _crear_ok(cliente, seccion.id, nombre="Guiso de lentejas")

    respuesta = _crear(cliente, seccion.id, nombre="GUISO DE LENTEJAS")

    assert respuesta.status_code == 409
    assert respuesta.json()["detalle"] == "El menú del día ya está registrado"


def test_crear_menu_del_dia_permite_el_nombre_de_un_plato(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion()
    cliente.post(
        RUTA_PLATOS,
        data={
            "datos": json.dumps(
                {
                    "nombre": "Guiso de lentejas",
                    "seccion_id": seccion.id,
                    "precio": "9900.00",
                    "ingredientes": ["Lentejas"],
                }
            )
        },
    )

    respuesta = _crear(cliente, seccion.id, nombre="Guiso de lentejas")

    assert respuesta.status_code == 201


# CA 4
def test_crear_menu_del_dia_con_nombre_de_101_caracteres_responde_422(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion()

    respuesta = _crear(cliente, seccion.id, nombre="x" * 101)

    assert respuesta.status_code == 422


# CA 5
@pytest.mark.parametrize("precio", ["0", "-10", "10.999"])
def test_crear_menu_del_dia_con_precio_invalido_responde_422(
    precio: str, cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion()

    respuesta = _crear(cliente, seccion.id, precio=precio)

    assert respuesta.status_code == 422


# CA 6
@pytest.mark.parametrize("ingredientes", [[""], ["Lentejas", "lentejas"]])
def test_crear_menu_del_dia_con_ingrediente_invalido_responde_422(
    ingredientes: list[str], cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion()

    respuesta = _crear(cliente, seccion.id, ingredientes=ingredientes)

    assert respuesta.status_code == 422


# CA 7
def test_crear_menu_del_dia_sin_ingredientes_responde_422(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion()

    respuesta = _crear(cliente, seccion.id, ingredientes=[])

    assert respuesta.status_code == 422
    assert "ingredientes" in respuesta.json()["detalle"]


# CA 8
def test_crear_menu_del_dia_con_descripcion_larga_responde_422(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion()

    respuesta = _crear(cliente, seccion.id, descripcion="x" * 501)

    assert respuesta.status_code == 422


# CA 10
def test_crear_menu_del_dia_en_seccion_deshabilitada_responde_409(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion(estado=Estado.DESHABILITADO)

    respuesta = _crear(cliente, seccion.id)

    assert respuesta.status_code == 409
    assert "deshabilitada" in respuesta.json()["detalle"]


def test_crear_menu_del_dia_con_seccion_inexistente_responde_404(
    cliente: TestClient, directorio_media: Path
) -> None:
    respuesta = _crear(cliente, 9999)

    assert respuesta.status_code == 404


# CA 11
def test_crear_menu_del_dia_con_imagen_de_otro_formato_responde_422(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion()

    respuesta = _crear(cliente, seccion.id, imagen=("foto.gif", b"GIF89a", "image/gif"))

    assert respuesta.status_code == 422
    assert "JPG, PNG o HEIC" in respuesta.json()["detalle"]
    assert not directorio_media.exists()


def test_crear_menu_del_dia_con_imagen_de_mas_de_5_mb_responde_422(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion()
    grande = b"\xff\xd8\xff" + b"0" * (5 * 1024 * 1024)

    respuesta = _crear(cliente, seccion.id, imagen=("foto.jpg", grande, "image/jpeg"))

    assert respuesta.status_code == 422


# CA 13
def test_crear_menu_del_dia_con_heic_lo_sirve_como_jpeg(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    pillow_heif.register_heif_opener()
    seccion = fabrica_seccion()

    cuerpo = _crear_ok(cliente, seccion.id, imagen=("foto.heic", _imagen("HEIF"), "image/heic"))

    aplicacion = FastAPI()
    montar_media(aplicacion, directorio_media)
    servida = TestClient(aplicacion).get(cuerpo["imagen_url"])
    assert cuerpo["imagen_url"].endswith(".jpg")
    assert servida.headers["content-type"] == "image/jpeg"


# CA 14
@pytest.mark.parametrize("etiquetas", [[""], ["x" * 31], ["Casero", "casero"]])
def test_crear_menu_del_dia_con_etiqueta_invalida_responde_422(
    etiquetas: list[str], cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion()

    respuesta = _crear(cliente, seccion.id, etiquetas=etiquetas)

    assert respuesta.status_code == 422


# CA 15
def test_crear_menu_del_dia_sin_opcionales_responde_201(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion()

    respuesta = _crear(cliente, seccion.id)

    assert respuesta.status_code == 201
    assert respuesta.json()["descripcion"] is None


def test_crear_menu_del_dia_aparece_en_la_carta(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion()
    _crear_ok(cliente, seccion.id)

    carta = cliente.get("/api/v1/carta").json()["items"]

    assert [producto["nombre"] for producto in carta[0]["productos"]] == ["Guiso de lentejas"]


# HU-M2-05
def test_modificar_menu_del_dia_cambia_los_datos(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion()
    creado = _crear_ok(cliente, seccion.id)

    respuesta = _modificar(
        cliente,
        creado["id"],
        seccion.id,
        nombre="Guiso de arroz",
        precio="10500.00",
        ingredientes=["Arroz"],
        descripcion="Con pan",
        etiquetas=["Casero"],
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["nombre"] == "Guiso de arroz"
    assert (respuesta.json()["precio"], respuesta.json()["descripcion"]) == ("10500.00", "Con pan")


def test_modificar_menu_del_dia_con_nombre_de_otro_menu_responde_409(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion()
    _crear_ok(cliente, seccion.id, nombre="Guiso")
    otro = _crear_ok(cliente, seccion.id, nombre="Pastel de papas")

    respuesta = _modificar(cliente, otro["id"], seccion.id, nombre="guiso")

    assert respuesta.status_code == 409


def test_modificar_menu_del_dia_reactiva_y_vuelve_a_la_lista(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion()
    creado = _crear_ok(cliente, seccion.id)
    cliente.post(f"{RUTA}/{creado['id']}/baja")

    respuesta = _modificar(cliente, creado["id"], seccion.id, estado="HABILITADO")

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "HABILITADO"
    assert cliente.get(RUTA).json()["total"] == 1


def test_modificar_menu_del_dia_conserva_el_precio_de_las_filas_relacionadas(
    cliente: TestClient, db: Session, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion()
    creado = _crear_ok(cliente, seccion.id)
    db.execute(
        text(
            "CREATE TABLE pedidos_historicos (id INTEGER PRIMARY KEY, menu_id INTEGER, "
            "precio_unitario NUMERIC)"
        )
    )
    db.execute(
        text("INSERT INTO pedidos_historicos (menu_id, precio_unitario) VALUES (:id, 9900.00)"),
        {"id": creado["id"]},
    )
    db.commit()

    _modificar(cliente, creado["id"], seccion.id, precio="12000.00")

    historico = db.execute(text("SELECT precio_unitario FROM pedidos_historicos")).scalar()
    assert float(historico) == 9900.00


def test_modificar_menu_del_dia_quitando_la_imagen(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion()
    creado = _crear_ok(cliente, seccion.id, imagen=("foto.jpg", _imagen(), "image/jpeg"))

    respuesta = _modificar(cliente, creado["id"], seccion.id, quitar_imagen=True)

    assert respuesta.status_code == 200
    assert respuesta.json()["imagen_url"] is None


def test_modificar_menu_del_dia_inexistente_responde_404(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion()

    assert _modificar(cliente, 9999, seccion.id).status_code == 404


def test_modificar_un_plato_por_la_ruta_de_menus_responde_404(
    cliente: TestClient, fabrica_producto, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion()
    plato = fabrica_producto(seccion, categoria=Categoria.PLATO)

    assert _modificar(cliente, plato.id, seccion.id).status_code == 404


# HU-M2-06
def test_dar_de_baja_menu_del_dia_lo_saca_de_la_lista(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion()
    creado = _crear_ok(cliente, seccion.id)

    respuesta = cliente.post(f"{RUTA}/{creado['id']}/baja")

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "DESHABILITADO"
    assert cliente.get(RUTA).json()["total"] == 0
    assert cliente.get("/api/v1/carta").json()["total"] == 0


def test_dar_de_baja_menu_del_dia_conserva_los_datos(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion()
    creado = _crear_ok(cliente, seccion.id, descripcion="Con pan")

    cliente.post(f"{RUTA}/{creado['id']}/baja")

    consultado = cliente.get(f"{RUTA}/{creado['id']}").json()
    assert (consultado["nombre"], consultado["descripcion"]) == (
        "Guiso de lentejas",
        "Con pan",
    )


def test_dar_de_baja_menu_del_dia_ya_deshabilitado_responde_409(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion()
    creado = _crear_ok(cliente, seccion.id)
    cliente.post(f"{RUTA}/{creado['id']}/baja")

    respuesta = cliente.post(f"{RUTA}/{creado['id']}/baja")

    assert respuesta.status_code == 409


def test_listar_menus_del_dia_filtra_los_deshabilitados(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion()
    creado = _crear_ok(cliente, seccion.id)
    cliente.post(f"{RUTA}/{creado['id']}/baja")

    respuesta = cliente.get(RUTA, params={"estado": "DESHABILITADO"})

    assert respuesta.status_code == 200
    assert [menu["id"] for menu in respuesta.json()["items"]] == [creado["id"]]


def test_listar_menus_del_dia_no_incluye_platos(
    cliente: TestClient, fabrica_seccion, fabrica_producto, directorio_media: Path
) -> None:
    seccion = fabrica_seccion()
    fabrica_producto(seccion, nombre="Milanesa", categoria=Categoria.PLATO)
    _crear_ok(cliente, seccion.id)

    assert cliente.get(RUTA).json()["total"] == 1


def test_consultar_menu_del_dia_completo(
    cliente: TestClient, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion()
    creado = _crear_ok(cliente, seccion.id, etiquetas=["Casero"])

    assert cliente.get(f"{RUTA}/{creado['id']}").json()["etiquetas"] == ["Casero"]


def test_consultar_menu_del_dia_inexistente_responde_404(cliente: TestClient) -> None:
    assert cliente.get(f"{RUTA}/9999").status_code == 404


def test_la_seccion_deshabilitada_no_aparece_entre_las_opciones(
    cliente: TestClient, db: Session, fabrica_seccion, directorio_media: Path
) -> None:
    habilitada = fabrica_seccion("Principales")
    apagada = fabrica_seccion("Postres", orden=2, estado=Estado.DESHABILITADO)

    respuesta = cliente.get("/api/v1/secciones", params={"estado": "HABILITADO"})

    assert [seccion["id"] for seccion in respuesta.json()["items"]] == [habilitada.id]
    assert apagada.id not in [seccion["id"] for seccion in respuesta.json()["items"]]
