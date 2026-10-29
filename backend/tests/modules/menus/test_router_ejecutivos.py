"""Pruebas de los endpoints de menús ejecutivos (HU-M2-01, HU-M2-02 y HU-M2-03)."""

from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.menus.models import MenuEjecutivo
from app.modules.productos.models import Seccion
from app.shared.models import Categoria, Estado, Producto

RUTA = "/api/v1/menus-ejecutivos"


def _cuerpo(seccion_id: int, producto_ids: list[int], nombre: str = "Almuerzo ejecutivo") -> dict:
    return {
        "nombre": nombre,
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


def _crear_menu(
    cliente: TestClient,
    seccion_id: int,
    producto_ids: list[int],
    nombre: str = "Almuerzo ejecutivo",
) -> dict:
    respuesta = cliente.post(RUTA, json=_cuerpo(seccion_id, producto_ids, nombre=nombre))
    assert respuesta.status_code == 201
    return respuesta.json()


def test_consultar_menu_ejecutivo_responde_200(cliente: TestClient, db: Session) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)
    creado = _crear_menu(cliente, seccion.id, [producto.id])

    respuesta = cliente.get(f"{RUTA}/{creado['id']}")

    assert respuesta.status_code == 200
    assert respuesta.json()["nombre"] == "Almuerzo ejecutivo"
    assert respuesta.json()["productos"][0]["id"] == producto.id


def test_consultar_menu_ejecutivo_inexistente_responde_404(cliente: TestClient) -> None:
    respuesta = cliente.get(f"{RUTA}/99")

    assert respuesta.status_code == 404
    assert "detalle" in respuesta.json()


def test_modificar_menu_ejecutivo_actualiza_datos_y_composicion(
    cliente: TestClient, db: Session
) -> None:
    seccion = _crear_seccion(db)
    otra_seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)
    otro_producto = _crear_producto(db, seccion.id)
    creado = _crear_menu(cliente, seccion.id, [producto.id])

    respuesta = cliente.put(
        f"{RUTA}/{creado['id']}",
        json={
            "nombre": "Cena ejecutiva",
            "precio_fijo": "2000.50",
            "producto_ids": [otro_producto.id],
            "seccion_id": otra_seccion.id,
            "descripcion": None,
        },
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["nombre"] == "Cena ejecutiva"
    assert respuesta.json()["precio_fijo"] == "2000.50"
    assert respuesta.json()["seccion"]["id"] == otra_seccion.id
    assert [p["id"] for p in respuesta.json()["productos"]] == [otro_producto.id]
    db.expire_all()
    menu = db.get(MenuEjecutivo, creado["id"])
    assert menu is not None
    assert menu.nombre == "Cena ejecutiva"
    assert [p.id for p in menu.productos] == [otro_producto.id]


def test_modificar_menu_ejecutivo_permite_conservar_su_nombre(
    cliente: TestClient, db: Session
) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)
    creado = _crear_menu(cliente, seccion.id, [producto.id])

    respuesta = cliente.put(
        f"{RUTA}/{creado['id']}",
        json=_cuerpo(seccion.id, [producto.id]) | {"precio_fijo": "1800.00"},
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["precio_fijo"] == "1800.00"


def test_modificar_menu_ejecutivo_rechaza_nombre_de_otro_menu(
    cliente: TestClient, db: Session
) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)
    _crear_menu(cliente, seccion.id, [producto.id])
    segundo = _crear_menu(cliente, seccion.id, [producto.id], nombre="Cena ejecutiva")

    respuesta = cliente.put(
        f"{RUTA}/{segundo['id']}",
        json=_cuerpo(seccion.id, [producto.id]) | {"nombre": " ALMUERZO EJECUTIVO "},
    )

    assert respuesta.status_code == 409
    assert "detalle" in respuesta.json()
    assert cliente.get(f"{RUTA}/{segundo['id']}").json()["nombre"] == "Cena ejecutiva"


@pytest.mark.parametrize(
    "cambio,campo",
    [
        ({"nombre": " "}, "nombre"),
        ({"precio_fijo": "0"}, "precio_fijo"),
        ({"producto_ids": []}, "producto_ids"),
        ({"seccion_id": 0}, "seccion_id"),
    ],
    ids=["sin-nombre", "precio-cero", "sin-productos", "seccion-invalida"],
)
def test_modificar_menu_ejecutivo_invalido_responde_422_sin_aplicar(
    cliente: TestClient, db: Session, cambio: dict, campo: str
) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)
    creado = _crear_menu(cliente, seccion.id, [producto.id])

    respuesta = cliente.put(
        f"{RUTA}/{creado['id']}",
        json=_cuerpo(seccion.id, [producto.id]) | cambio,
    )

    assert respuesta.status_code == 422
    assert campo in respuesta.json()["detalle"]
    db.expire_all()
    menu = db.get(MenuEjecutivo, creado["id"])
    assert menu is not None
    assert menu.precio_fijo == Decimal(creado["precio_fijo"])
    assert [p.id for p in menu.productos] == [producto.id]


@pytest.mark.parametrize(
    "categoria,estado,mensaje",
    [
        (Categoria.PLATO, Estado.DESHABILITADO, "habilitados"),
        (Categoria.MENU_DEL_DIA, Estado.HABILITADO, "menús del día"),
    ],
    ids=["producto-deshabilitado", "menu-del-dia"],
)
def test_modificar_menu_ejecutivo_rechaza_producto_no_permitido(
    cliente: TestClient,
    db: Session,
    categoria: Categoria,
    estado: Estado,
    mensaje: str,
) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)
    creado = _crear_menu(cliente, seccion.id, [producto.id])
    no_permitido = _crear_producto(db, seccion.id, categoria, estado)

    respuesta = cliente.put(
        f"{RUTA}/{creado['id']}",
        json=_cuerpo(seccion.id, [no_permitido.id]),
    )

    assert respuesta.status_code == 409
    assert mensaje in respuesta.json()["detalle"]
    db.expire_all()
    menu = db.get(MenuEjecutivo, creado["id"])
    assert menu is not None
    assert [p.id for p in menu.productos] == [producto.id]


def test_modificar_menu_ejecutivo_rechaza_mover_a_seccion_deshabilitada(
    cliente: TestClient, db: Session
) -> None:
    seccion = _crear_seccion(db)
    deshabilitada = _crear_seccion(db, estado=Estado.DESHABILITADO)
    producto = _crear_producto(db, seccion.id)
    creado = _crear_menu(cliente, seccion.id, [producto.id])

    respuesta = cliente.put(
        f"{RUTA}/{creado['id']}",
        json=_cuerpo(deshabilitada.id, [producto.id]),
    )

    assert respuesta.status_code == 409
    assert "deshabilitada" in respuesta.json()["detalle"]


def test_modificar_menu_ejecutivo_conserva_una_seccion_que_quedo_deshabilitada(
    cliente: TestClient, db: Session
) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)
    creado = _crear_menu(cliente, seccion.id, [producto.id])
    seccion.estado = Estado.DESHABILITADO
    db.commit()

    respuesta = cliente.put(
        f"{RUTA}/{creado['id']}",
        json=_cuerpo(seccion.id, [producto.id]) | {"nombre": "Almuerzo especial"},
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["nombre"] == "Almuerzo especial"


def test_modificar_menu_ejecutivo_reactiva_y_vuelve_al_listado(
    cliente: TestClient, db: Session
) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)
    creado = _crear_menu(cliente, seccion.id, [producto.id])
    cliente.post(f"{RUTA}/{creado['id']}/baja")

    respuesta = cliente.put(
        f"{RUTA}/{creado['id']}",
        json=_cuerpo(seccion.id, [producto.id]) | {"estado": "HABILITADO"},
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "HABILITADO"
    listado = cliente.get(RUTA, params={"estado": "HABILITADO", "limit": 10, "offset": 0})
    assert listado.json()["total"] == 1


def test_dar_de_baja_menu_ejecutivo_conserva_registro_y_productos(
    cliente: TestClient, db: Session
) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)
    creado = _crear_menu(cliente, seccion.id, [producto.id])

    respuesta = cliente.post(f"{RUTA}/{creado['id']}/baja")

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "DESHABILITADO"
    assert respuesta.json()["productos"][0]["id"] == producto.id
    db.expire_all()
    menu = db.get(MenuEjecutivo, creado["id"])
    assert menu is not None
    assert menu.estado == Estado.DESHABILITADO
    assert db.get(Producto, producto.id).estado == Estado.HABILITADO
    listado = cliente.get(RUTA, params={"estado": "HABILITADO", "limit": 10, "offset": 0})
    assert listado.json()["total"] == 0
    assert cliente.get(f"{RUTA}/{creado['id']}").status_code == 200


def test_dar_de_baja_menu_ejecutivo_ya_deshabilitado_responde_409(
    cliente: TestClient, db: Session
) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)
    creado = _crear_menu(cliente, seccion.id, [producto.id])
    cliente.post(f"{RUTA}/{creado['id']}/baja")

    respuesta = cliente.post(f"{RUTA}/{creado['id']}/baja")

    assert respuesta.status_code == 409
    assert "deshabilitado" in respuesta.json()["detalle"]


def test_dar_de_baja_menu_ejecutivo_inexistente_responde_404(cliente: TestClient) -> None:
    respuesta = cliente.post(f"{RUTA}/99/baja")

    assert respuesta.status_code == 404
