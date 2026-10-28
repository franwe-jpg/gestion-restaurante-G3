"""Pruebas de los endpoints de menús ejecutivos (HU-M2-01)."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.menus.models import MenuEjecutivo
from app.modules.productos.models import Seccion
from app.shared.models import Categoria, Estado, Producto

RUTA = "/api/v1/menus-ejecutivos"


def _cuerpo(seccion_id: int, producto_ids: list[int]) -> dict:
    return {
        "nombre": "Almuerzo ejecutivo",
        "precio_fijo": "1500.00",
        "producto_ids": producto_ids,
        "seccion_id": seccion_id,
        "descripcion": "Incluye bebida",
    }


def _crear_producto(
    db: Session,
    seccion_id: int,
    categoria: Categoria = Categoria.PLATO,
    estado: Estado = Estado.HABILITADO,
) -> Producto:
    producto = Producto(
        nombre=f"Producto {len(db.scalars(select(Producto)).all()) + 1}",
        categoria=categoria,
        precio="1000.00",
        ingredientes=[],
        descripcion=None,
        imagen=None,
        etiquetas=[],
        estado=estado,
        seccion_id=seccion_id,
    )
    db.add(producto)
    db.commit()
    return producto


def _crear_seccion(db: Session, estado: Estado = Estado.HABILITADO) -> Seccion:
    seccion = Seccion(
        nombre=f"Sección {len(db.scalars(select(Seccion)).all()) + 1}",
        orden=len(db.scalars(select(Seccion)).all()) + 1,
        estado=estado,
    )
    db.add(seccion)
    db.commit()
    return seccion


def test_crear_menu_ejecutivo_responde_201_con_estado_y_relaciones(
    cliente: TestClient, db: Session
) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)

    respuesta = cliente.post(RUTA, json=_cuerpo(seccion.id, [producto.id]))

    assert respuesta.status_code == 201
    assert respuesta.json()["estado"] == "HABILITADO"
    assert respuesta.json()["precio_fijo"] == "1500.00"
    assert respuesta.json()["seccion"] == {"id": seccion.id, "nombre": seccion.nombre}
    assert respuesta.json()["productos"][0]["id"] == producto.id


@pytest.mark.parametrize(
    "cuerpo,campo",
    [
        ({}, "nombre"),
        ({"precio_fijo": "1000"}, "nombre"),
        ({"producto_ids": []}, "producto_ids"),
        ({"seccion_id": 0}, "seccion_id"),
        ({"precio_fijo": "0"}, "precio_fijo"),
        ({"estado": "DESHABILITADO"}, "estado"),
    ],
    ids=[
        "sin-datos",
        "sin-nombre",
        "sin-productos",
        "seccion-invalida",
        "precio-cero",
        "estado-extra",
    ],
)
def test_crear_menu_ejecutivo_invalido_responde_422_sin_guardar(
    cliente: TestClient, db: Session, cuerpo: dict, campo: str
) -> None:
    respuesta = cliente.post(RUTA, json=cuerpo)

    assert respuesta.status_code == 422
    assert campo in respuesta.json()["detalle"]
    assert len(db.scalars(select(MenuEjecutivo)).all()) == 0


def test_crear_menu_ejecutivo_repetido_responde_409(cliente: TestClient, db: Session) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)
    cuerpo = _cuerpo(seccion.id, [producto.id])
    cliente.post(RUTA, json=cuerpo)

    respuesta = cliente.post(RUTA, json=cuerpo | {"nombre": "  ALMUERZO EJECUTIVO "})

    assert respuesta.status_code == 409
    assert "detalle" in respuesta.json()


@pytest.mark.parametrize(
    "categoria,estado,mensaje",
    [
        (Categoria.PLATO, Estado.DESHABILITADO, "habilitados"),
        (Categoria.MENU_DEL_DIA, Estado.HABILITADO, "menús del día"),
    ],
    ids=["producto-deshabilitado", "menu-del-dia"],
)
def test_crear_menu_ejecutivo_rechaza_producto_no_permitido(
    cliente: TestClient,
    db: Session,
    categoria: Categoria,
    estado: Estado,
    mensaje: str,
) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id, categoria, estado)

    respuesta = cliente.post(RUTA, json=_cuerpo(seccion.id, [producto.id]))

    assert respuesta.status_code == 409
    assert mensaje in respuesta.json()["detalle"]


def test_listar_menus_ejecutivos_paginado(cliente: TestClient, db: Session) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)
    cliente.post(RUTA, json=_cuerpo(seccion.id, [producto.id]))

    respuesta = cliente.get(RUTA, params={"estado": "HABILITADO", "limit": 10, "offset": 0})

    assert respuesta.status_code == 200
    assert respuesta.json()["total"] == 1
    assert respuesta.json()["items"][0]["nombre"] == "Almuerzo ejecutivo"
