"""Pruebas de los endpoints de promociones (HU-M2-07)."""

from datetime import date, time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.menus.models import Promocion
from app.modules.productos.models import Seccion
from app.shared.models import Categoria, Estado, Producto

RUTA = "/api/v1/promociones"


def _cuerpo(producto_ids: list[int], **cambios: object) -> dict:
    base = {
        "nombre": "Happy hour",
        "tipo": "PORCENTAJE",
        "descripcion": "Descuento de tarde",
        "producto_ids": producto_ids,
        "fecha_desde": "2026-11-01",
        "fecha_hasta": "2026-11-30",
        "dias_semana": ["LUNES", "MARTES"],
        "hora_desde": "17:00",
        "hora_hasta": "20:30",
        "descuento_porcentaje": 15,
    }
    return base | cambios


def _crear_seccion(db: Session) -> Seccion:
    seccion = Seccion(
        nombre=f"Sección {len(db.scalars(select(Seccion)).all()) + 1}",
        orden=len(db.scalars(select(Seccion)).all()) + 1,
        estado=Estado.HABILITADO,
    )
    db.add(seccion)
    db.commit()
    return seccion


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


def test_crear_promocion_responde_201_y_asocia_productos(cliente: TestClient, db: Session) -> None:
    seccion = _crear_seccion(db)
    producto_1 = _crear_producto(db, seccion.id)
    producto_2 = _crear_producto(db, seccion.id)

    respuesta = cliente.post(RUTA, json=_cuerpo([producto_1.id, producto_2.id]))

    assert respuesta.status_code == 201
    cuerpo = respuesta.json()
    assert cuerpo["estado"] == "HABILITADO"
    assert cuerpo["tipo"] == "PORCENTAJE"
    assert cuerpo["hora_desde"] == "17:00"
    assert cuerpo["hora_hasta"] == "20:30"
    assert [producto["id"] for producto in cuerpo["productos"]] == [
        producto_1.id,
        producto_2.id,
    ]


def test_crear_promocion_precio_fijo_responde_201(cliente: TestClient, db: Session) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)

    respuesta = cliente.post(
        RUTA,
        json=_cuerpo(
            [producto.id],
            tipo="PRECIO_FIJO",
            descuento_porcentaje=None,
            precio_fijo="1200.00",
        ),
    )

    assert respuesta.status_code == 201
    assert respuesta.json()["precio_fijo"] == "1200.00"


def test_crear_promocion_nxm_responde_201(cliente: TestClient, db: Session) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)

    respuesta = cliente.post(
        RUTA,
        json=_cuerpo(
            [producto.id],
            tipo="NXM",
            descuento_porcentaje=None,
            cant_lleva=2,
            cant_paga=1,
        ),
    )

    assert respuesta.status_code == 201
    assert (respuesta.json()["cant_lleva"], respuesta.json()["cant_paga"]) == (2, 1)


@pytest.mark.parametrize(
    "cambios,fragmento",
    [
        ({"nombre": None}, "nombre"),
        ({"tipo": None}, "tipo"),
        ({"fecha_desde": None}, "fecha_desde"),
        ({"fecha_hasta": "2026-10-31"}, "fecha"),
        ({"hora_desde": None}, "franja"),
        ({"hora_hasta": "17:00"}, "hora"),
        ({"dias_semana": []}, "dias_semana"),
        ({"descuento_porcentaje": 0}, "descuento"),
        ({"descuento_porcentaje": 101}, "descuento"),
        ({"descuento_porcentaje": 10, "precio_fijo": "100.00"}, "porcentaje"),
        ({"estado": "HABILITADO"}, "estado"),
    ],
    ids=[
        "sin-nombre",
        "sin-tipo",
        "sin-fecha-desde",
        "fecha-hasta-anterior",
        "solo-hora-desde",
        "hora-hasta-igual",
        "sin-dias",
        "porcentaje-cero",
        "porcentaje-101",
        "porcentaje-con-precio",
        "estado-extra",
    ],
)
def test_crear_promocion_invalida_responde_422_sin_guardar(
    cliente: TestClient, db: Session, cambios: dict, fragmento: str
) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)

    respuesta = cliente.post(RUTA, json=_cuerpo([producto.id], **cambios))

    assert respuesta.status_code == 422
    assert fragmento.casefold() in respuesta.json()["detalle"].casefold()
    assert db.scalars(select(Promocion)).all() == []


def test_crear_promocion_sin_productos_responde_422(cliente: TestClient) -> None:
    respuesta = cliente.post(RUTA, json=_cuerpo([]))

    assert respuesta.status_code == 422
    assert "producto_ids" in respuesta.json()["detalle"]


def test_crear_promocion_nxm_incoherente_responde_422(cliente: TestClient, db: Session) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)

    respuesta = cliente.post(
        RUTA,
        json=_cuerpo(
            [producto.id],
            tipo="NXM",
            descuento_porcentaje=None,
            cant_lleva=1,
            cant_paga=2,
        ),
    )

    assert respuesta.status_code == 422
    assert "paga" in respuesta.json()["detalle"]


def test_crear_promocion_con_nombre_repetido_responde_409(cliente: TestClient, db: Session) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)
    cuerpo = _cuerpo([producto.id])
    assert cliente.post(RUTA, json=cuerpo).status_code == 201

    respuesta = cliente.post(RUTA, json=cuerpo | {"nombre": "  HAPPY HOUR "})

    assert respuesta.status_code == 409
    assert "ya existe" in respuesta.json()["detalle"]


def test_crear_promocion_con_producto_inexistente_responde_404(
    cliente: TestClient,
) -> None:
    respuesta = cliente.post(RUTA, json=_cuerpo([9999]))

    assert respuesta.status_code == 404
    assert "no existe" in respuesta.json()["detalle"]


def test_crear_promocion_con_producto_deshabilitado_responde_409(
    cliente: TestClient, db: Session
) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id, estado=Estado.DESHABILITADO)

    respuesta = cliente.post(RUTA, json=_cuerpo([producto.id]))

    assert respuesta.status_code == 409
    assert "habilitados" in respuesta.json()["detalle"]


def test_listar_promociones_paginadas(cliente: TestClient, db: Session) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)
    cliente.post(RUTA, json=_cuerpo([producto.id], nombre="Zeta"))
    cliente.post(RUTA, json=_cuerpo([producto.id], nombre="Alfa"))

    respuesta = cliente.get(RUTA, params={"limit": 10, "offset": 0})

    assert respuesta.status_code == 200
    assert respuesta.json()["total"] == 2
    assert [item["nombre"] for item in respuesta.json()["items"]] == ["Alfa", "Zeta"]


def test_listar_promociones_filtra_por_estado(cliente: TestClient, db: Session) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)
    cliente.post(RUTA, json=_cuerpo([producto.id]))

    respuesta = cliente.get(RUTA, params={"estado": "DESHABILITADO"})

    assert respuesta.status_code == 200
    assert respuesta.json()["total"] == 0


def test_fechas_y_horas_se_serializan_para_la_pantalla(cliente: TestClient, db: Session) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)

    respuesta = cliente.post(RUTA, json=_cuerpo([producto.id]))

    assert respuesta.json()["fecha_desde"] == "2026-11-01"
    assert respuesta.json()["hora_desde"] == "17:00"
    assert respuesta.json()["hora_hasta"] == "20:30"
    assert date.fromisoformat(respuesta.json()["fecha_hasta"]) == date(2026, 11, 30)


def test_horario_vacio_es_aceptado(cliente: TestClient, db: Session) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)

    respuesta = cliente.post(RUTA, json=_cuerpo([producto.id], hora_desde=None, hora_hasta=None))

    assert respuesta.status_code == 201
    assert respuesta.json()["hora_desde"] is None
    assert respuesta.json()["hora_hasta"] is None


def test_promocion_permite_menu_del_dia(cliente: TestClient, db: Session) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id, categoria=Categoria.MENU_DEL_DIA)

    respuesta = cliente.post(RUTA, json=_cuerpo([producto.id]))

    assert respuesta.status_code == 201


def test_hora_desde_y_hasta_se_parsean_como_time(cliente: TestClient, db: Session) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)

    respuesta = cliente.post(RUTA, json=_cuerpo([producto.id]))

    assert respuesta.json()["hora_desde"] == time(17, 0).strftime("%H:%M")


def _crear_promocion(cliente: TestClient, producto_id: int, nombre: str = "Happy hour") -> dict:
    respuesta = cliente.post(RUTA, json=_cuerpo([producto_id], nombre=nombre))
    assert respuesta.status_code == 201
    return respuesta.json()


def test_modificar_promocion_responde_200(cliente: TestClient, db: Session) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)
    creada = _crear_promocion(cliente, producto.id)

    respuesta = cliente.put(
        f"{RUTA}/{creada['id']}",
        json=_cuerpo(
            [producto.id],
            nombre="Noche de pizzas",
            tipo="PRECIO_FIJO",
            descuento_porcentaje=None,
            precio_fijo="900.00",
            hora_desde=None,
            hora_hasta=None,
        ),
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["nombre"] == "Noche de pizzas"
    assert respuesta.json()["tipo"] == "PRECIO_FIJO"
    assert respuesta.json()["precio_fijo"] == "900.00"
    assert respuesta.json()["descuento_porcentaje"] is None


def test_modificar_promocion_inexistente_responde_404(cliente: TestClient) -> None:
    respuesta = cliente.put(f"{RUTA}/9999", json=_cuerpo([1]))

    assert respuesta.status_code == 404


def test_modificar_promocion_finalizada_responde_409(cliente: TestClient, db: Session) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)
    creada = _crear_promocion(cliente, producto.id)
    promocion = db.get(Promocion, creada["id"])
    promocion.estado = Estado.DESHABILITADO
    db.commit()

    respuesta = cliente.put(f"{RUTA}/{creada['id']}", json=_cuerpo([producto.id]))

    assert respuesta.status_code == 409
    assert "finalizada" in respuesta.json()["detalle"]


def test_modificar_promocion_aplicada_responde_409(
    cliente: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)
    creada = _crear_promocion(cliente, producto.id)
    monkeypatch.setattr(
        "app.modules.menus.service.atencion_service.promocion_fue_aplicada",
        lambda _db, _id: True,
    )

    respuesta = cliente.put(f"{RUTA}/{creada['id']}", json=_cuerpo([producto.id]))

    assert respuesta.status_code == 409
    assert "aplicada" in respuesta.json()["detalle"]


def test_modificar_promocion_nombre_repetido_responde_409(cliente: TestClient, db: Session) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)
    _crear_promocion(cliente, producto.id, nombre="Happy hour")
    segunda = _crear_promocion(cliente, producto.id, nombre="Noche")

    respuesta = cliente.put(
        f"{RUTA}/{segunda['id']}",
        json=_cuerpo([producto.id], nombre="happy HOUR"),
    )

    assert respuesta.status_code == 409


def test_modificar_promocion_con_datos_invalidos_responde_422(
    cliente: TestClient, db: Session
) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)
    creada = _crear_promocion(cliente, producto.id)

    respuesta = cliente.put(
        f"{RUTA}/{creada['id']}",
        json=_cuerpo([producto.id], fecha_hasta="2026-10-31"),
    )

    assert respuesta.status_code == 422
    assert "fecha" in respuesta.json()["detalle"]


def test_modificar_promocion_no_acepta_estado(cliente: TestClient, db: Session) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)
    creada = _crear_promocion(cliente, producto.id)

    respuesta = cliente.put(
        f"{RUTA}/{creada['id']}",
        json=_cuerpo([producto.id], estado="DESHABILITADO"),
    )

    assert respuesta.status_code == 422
    assert "estado" in respuesta.json()["detalle"]


def test_finalizar_promocion_responde_200_y_registra_instante(
    cliente: TestClient, db: Session
) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)
    creada = _crear_promocion(cliente, producto.id)

    respuesta = cliente.post(f"{RUTA}/{creada['id']}/finalizar")

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "DESHABILITADO"
    assert respuesta.json()["fecha_hora_finalizacion"] is not None


def test_finalizar_promocion_ya_finalizada_responde_409(cliente: TestClient, db: Session) -> None:
    seccion = _crear_seccion(db)
    producto = _crear_producto(db, seccion.id)
    creada = _crear_promocion(cliente, producto.id)
    cliente.post(f"{RUTA}/{creada['id']}/finalizar")

    respuesta = cliente.post(f"{RUTA}/{creada['id']}/finalizar")

    assert respuesta.status_code == 409
    assert "finalizada" in respuesta.json()["detalle"]


def test_finalizar_promocion_inexistente_responde_404(cliente: TestClient) -> None:
    respuesta = cliente.post(f"{RUTA}/9999/finalizar")

    assert respuesta.status_code == 404
