"""Contratos HTTP de Cliente y Comanda en M4."""

from collections.abc import Iterator
from datetime import timedelta

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.main import app as app_principal
from app.modules.atencion.models import Cliente, Comanda
from app.modules.atencion.router import router
from app.modules.menus import service as menus_service
from app.modules.pagos import service as pagos_service
from app.modules.productos import service as productos_service
from app.modules.salon import service as salon_service
from app.shared.contratos.comanda import ComandaSalida, EstadoComanda, EstadoEntrega
from app.shared.models import Categoria

RUTA = "/api/v1/clientes"


def test_openapi_agrupa_rutas_comanda_en_tag_atencion(cliente: TestClient) -> None:
    esquema = cliente.get("/openapi.json").json()
    operaciones = [
        operacion
        for ruta, metodos in esquema["paths"].items()
        if ruta.startswith("/api/v1/comandas")
        for operacion in metodos.values()
    ]

    assert operaciones
    assert all(operacion["tags"] == ["Atención al Público"] for operacion in operaciones)


def test_listar_comandas_incluye_mesa_estado_sin_filtro_implicito(
    cliente: TestClient,
    db: Session,
    comanda: Comanda,
) -> None:
    cerrada = Comanda(mesa_id=1, estado=EstadoComanda.CERRADA, fecha_hora=comanda.fecha_hora)
    db.add(cerrada)
    db.commit()

    respuesta = cliente.get("/api/v1/comandas")

    assert respuesta.status_code == 200
    pagina = respuesta.json()
    assert pagina["total"] == 2
    assert pagina["limit"] == 50
    assert pagina["offset"] == 0
    assert [item["id"] for item in pagina["items"]] == [cerrada.id, comanda.id]
    assert [item["estado"] for item in pagina["items"]] == ["CERRADA", "ABIERTA"]
    assert pagina["items"][0]["mesa_id"] == 1
    assert pagina["items"][0]["fecha_hora"] == "2026-10-31T12:30:15.123456Z"


def test_listar_comandas_sin_registros_devuelve_pagina_vacia(cliente: TestClient) -> None:
    respuesta = cliente.get("/api/v1/comandas")

    assert respuesta.status_code == 200
    assert respuesta.json() == {"items": [], "total": 0, "limit": 50, "offset": 0}


@pytest.fixture
def cliente_m4(db: Session) -> Iterator[TestClient]:
    app = FastAPI()
    app.exception_handlers.update(app_principal.exception_handlers)
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as cliente:
        yield cliente


def guardar(db: Session, nombre: str = "Ana", telefono: str = "123") -> Cliente:
    registro = Cliente(nombre=nombre, telefono=telefono)
    db.add(registro)
    db.commit()
    return registro


def test_app_principal_registra_get_put_sin_alta_ni_baja(db: Session) -> None:
    registro = guardar(db)
    app_principal.dependency_overrides[get_db] = lambda: db
    try:
        with TestClient(app_principal) as cliente:
            listado = cliente.get(RUTA)
            edicion = cliente.put(
                f"{RUTA}/{registro.id}", json={"nombre": "María", "telefono": "+54 456-789"}
            )
            consulta = cliente.get(RUTA)
            alta = cliente.post(RUTA, json={"nombre": "Luis", "telefono": "789"})
            baja = cliente.delete(f"{RUTA}/{registro.id}")
    finally:
        app_principal.dependency_overrides.pop(get_db, None)

    assert listado.status_code == 200
    assert listado.json()["items"] == [{"id": registro.id, "nombre": "Ana", "telefono": "123"}]
    assert edicion.status_code == 200
    assert edicion.json() == {"id": registro.id, "nombre": "María", "telefono": "+54 456-789"}
    assert consulta.json()["items"] == [edicion.json()]
    assert alta.status_code == 405
    assert baja.status_code == 405


def test_modificar_cliente_devuelve_200_y_consulta_posterior(
    cliente_m4: TestClient, db: Session
) -> None:
    registro = guardar(db)

    respuesta = cliente_m4.put(
        f"{RUTA}/{registro.id}", json={"nombre": "María", "telefono": "+54 456-789"}
    )

    assert respuesta.status_code == 200
    assert respuesta.json() == {"id": registro.id, "nombre": "María", "telefono": "+54 456-789"}
    consulta = cliente_m4.get(RUTA)
    assert consulta.status_code == 200, consulta.json()
    assert consulta.json()["items"] == [respuesta.json()]


def test_modificar_cliente_inexistente_devuelve_404(cliente_m4: TestClient) -> None:
    respuesta = cliente_m4.put(f"{RUTA}/99", json={"nombre": "Ana", "telefono": "123"})

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detalle": "El cliente 99 no existe"}


@pytest.mark.parametrize(
    "cuerpo,campo",
    [
        ({"nombre": "Ana2", "telefono": "456"}, "nombre"),
        ({"nombre": "Ana!", "telefono": "456"}, "nombre"),
        ({"nombre": "Ana", "telefono": "12a3"}, "telefono"),
        ({"nombre": "Ana", "telefono": "12+34"}, "telefono"),
        ({"nombre": "", "telefono": "456"}, "nombre"),
        ({"nombre": "Ana", "telefono": ""}, "telefono"),
        ({"telefono": "456"}, "nombre"),
        ({"nombre": "Ana"}, "telefono"),
    ],
)
def test_modificar_cliente_invalido_devuelve_422_y_conserva_ambos_datos(
    cliente_m4: TestClient, db: Session, cuerpo: dict, campo: str
) -> None:
    registro = guardar(db)

    respuesta = cliente_m4.put(f"{RUTA}/{registro.id}", json=cuerpo)
    db.expire_all()

    assert respuesta.status_code == 422
    assert campo in respuesta.json()["detalle"]
    assert (db.get(Cliente, registro.id).nombre, db.get(Cliente, registro.id).telefono) == (
        "Ana",
        "123",
    )


def test_listar_clientes_pagina_con_contacto_y_total(cliente_m4: TestClient, db: Session) -> None:
    guardar(db, "Ana", "123")
    guardar(db, "Luis", "456")

    respuesta = cliente_m4.get(f"{RUTA}?limit=1&offset=1")

    assert respuesta.status_code == 200
    assert respuesta.json() == {
        "items": [{"id": 2, "nombre": "Luis", "telefono": "456"}],
        "total": 2,
        "limit": 1,
        "offset": 1,
    }


@pytest.mark.parametrize(
    "q,esperados",
    [("Ana", ["Ana", "Anabel"]), ("nabel", ["Anabel"]), ("123", ["Ana", "Anabel"]), ("nadie", [])],
)
def test_listar_clientes_busca_nombre_o_telefono(
    cliente_m4: TestClient, db: Session, q: str, esperados: list[str]
) -> None:
    guardar(db, "Ana", "123")
    guardar(db, "Anabel", "123")
    guardar(db, "Luis", "456")

    respuesta = cliente_m4.get(RUTA, params={"q": q})

    assert respuesta.status_code == 200
    assert [item["nombre"] for item in respuesta.json()["items"]] == esperados
    assert respuesta.json()["total"] == len(esperados)


def test_listar_clientes_registro_vacio(cliente_m4: TestClient) -> None:
    respuesta = cliente_m4.get(RUTA)

    assert respuesta.status_code == 200
    assert respuesta.json() == {"items": [], "total": 0, "limit": 50, "offset": 0}


@pytest.mark.parametrize(
    ("segundos", "indices"),
    [([2, 1], [1, 2, 0]), ([0, 0], [2, 1, 0])],
    ids=["timestamp-desc", "timestamp-tie-id-desc"],
)
def test_listar_comandas_preserva_orden_s2_01_antes_de_paginar(
    cliente: TestClient,
    db: Session,
    comanda: Comanda,
    segundos: list[int],
    indices: list[int],
) -> None:
    registros = [comanda] + [
        Comanda(
            mesa_id=1,
            estado=EstadoComanda.CERRADA,
            fecha_hora=comanda.fecha_hora + timedelta(seconds=desplazamiento),
        )
        for desplazamiento in segundos
    ]
    db.add_all(registros[1:])
    db.commit()
    esperados = [registros[i].id for i in indices]

    respuesta = cliente.get("/api/v1/comandas")

    assert respuesta.status_code == 200
    assert respuesta.json()["total"] == 3
    assert [item["id"] for item in respuesta.json()["items"]] == esperados
    pagina = cliente.get("/api/v1/comandas?limit=1&offset=1")
    assert pagina.status_code == 200
    assert pagina.json()["total"] == 3
    assert pagina.json()["limit"] == 1
    assert pagina.json()["offset"] == 1
    assert [item["id"] for item in pagina.json()["items"]] == esperados[1:2]


@pytest.mark.parametrize(
    ("consulta", "indices"),
    [
        ("mesa_id=1", [1, 0]),
        ("estado=CERRADA", [2, 1]),
        ("mesa_id=2&estado=CERRADA", [2]),
        ("mesa_id=2&estado=ABIERTA", []),
        ("estado=ANULADA", [3]),
        ("mesa_id=999", []),
        ("limit=1&offset=1", [2]),
        ("offset=10", []),
    ],
)
def test_listar_comandas_filtra_y_pagina_con_total_previo(
    cliente: TestClient,
    db: Session,
    comanda: Comanda,
    consulta: str,
    indices: list[int],
) -> None:
    registros = [
        comanda,
        Comanda(mesa_id=1, estado="CERRADA", fecha_hora=comanda.fecha_hora),
        Comanda(mesa_id=2, estado="CERRADA", fecha_hora=comanda.fecha_hora),
        Comanda(mesa_id=2, estado="ANULADA", fecha_hora=comanda.fecha_hora),
    ]
    db.add_all(registros[1:])
    db.commit()

    respuesta = cliente.get(f"/api/v1/comandas?{consulta}")

    assert respuesta.status_code == 200
    pagina = respuesta.json()
    assert [item["id"] for item in pagina["items"]] == [registros[i].id for i in indices]
    assert pagina["total"] == (4 if "offset=" in consulta else len(indices))
    assert pagina["limit"] == (1 if "limit=1" in consulta else 50)
    assert pagina["offset"] == (10 if "offset=10" in consulta else int("offset=1" in consulta))


@pytest.mark.parametrize(
    "consulta",
    [
        "mesa_id=0",
        "mesa_id=-1",
        "mesa_id=1.5",
        "mesa_id=abc",
        "mesa_id=1%20OR%201=1",
        "estado=abierta",
        "estado=DESCONOCIDO",
        "limit=0",
        "limit=101",
        "limit=abc",
        "offset=-1",
        "offset=1.5",
    ],
)
def test_listar_comandas_parametros_invalidos_devuelve_detalle(
    cliente: TestClient,
    comanda: Comanda,
    consulta: str,
) -> None:
    respuesta = cliente.get(f"/api/v1/comandas?{consulta}")

    assert respuesta.status_code == 422
    assert set(respuesta.json()) == {"detalle"}
    assert isinstance(respuesta.json()["detalle"], str)
    assert respuesta.json()["detalle"]


def test_cerrar_comanda_devuelve_salida_compartida_y_segundo_cierre_conflicto(
    cliente: TestClient,
    db: Session,
    comanda: Comanda,
) -> None:
    respuesta = cliente.post(f"/api/v1/comandas/{comanda.id}/cerrar")

    assert respuesta.status_code == 200
    salida = ComandaSalida.model_validate(respuesta.json())
    assert salida.id == comanda.id
    assert salida.estado == EstadoComanda.CERRADA
    assert salida.fecha_hora == comanda.fecha_hora
    assert salida.reserva_id == 7
    assert salida.observaciones == "Sin sal"
    assert respuesta.json()["detalles"] == [
        {
            "id": comanda.detalles[0].id,
            "producto_id": 1,
            "menu_ejecutivo_id": None,
            "cantidad": 2,
            "precio_unitario": "29.90",
            "descuento": "3.25",
            "promocion_id": 8,
            "estado_entrega": "ENTREGADO",
        }
    ]
    assert _estado_mesa(db, comanda.mesa_id) == "LIBRE"
    segunda = cliente.post(f"/api/v1/comandas/{comanda.id}/cerrar")
    assert segunda.status_code == 409
    assert set(segunda.json()) == {"detalle"}
    db.expire_all()
    assert db.get(Comanda, comanda.id).estado == EstadoComanda.CERRADA
    assert _estado_mesa(db, comanda.mesa_id) == "LIBRE"


def test_cerrar_comanda_inexistente_devuelve_404(cliente: TestClient, comanda: Comanda) -> None:
    respuesta = cliente.post("/api/v1/comandas/999/cerrar")

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detalle": "La comanda 999 no existe"}


def test_anular_comanda_no_facturada_devuelve_salida_y_libera_mesa(
    cliente: TestClient, db: Session, comanda: Comanda, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(pagos_service, "esta_facturada", lambda _db, _id: False, raising=False)

    respuesta = cliente.post(f"/api/v1/comandas/{comanda.id}/anular")

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "ANULADA"
    assert len(respuesta.json()["detalles"]) == 1
    assert _estado_mesa(db, comanda.mesa_id) == "LIBRE"
    historial = cliente.get("/api/v1/comandas?estado=ANULADA")
    assert historial.status_code == 200
    assert [item["id"] for item in historial.json()["items"]] == [comanda.id]


def test_anular_comanda_servicio_m6_ausente_devuelve_conflicto_sin_efectos(
    cliente: TestClient, db: Session, comanda: Comanda, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delattr(pagos_service, "esta_facturada", raising=False)

    respuesta = cliente.post(f"/api/v1/comandas/{comanda.id}/anular")

    assert respuesta.status_code == 409
    assert "servicio de facturación" in respuesta.json()["detalle"]
    db.expire_all()
    assert db.get(Comanda, comanda.id).estado == EstadoComanda.ABIERTA
    assert _estado_mesa(db, comanda.mesa_id) == "OCUPADA"


def test_anular_comanda_facturada_devuelve_conflicto_sin_efectos(
    cliente: TestClient, db: Session, comanda: Comanda, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(pagos_service, "esta_facturada", lambda _db, _id: True, raising=False)

    respuesta = cliente.post(f"/api/v1/comandas/{comanda.id}/anular")

    assert respuesta.status_code == 409
    assert "facturada" in respuesta.json()["detalle"]
    db.expire_all()
    assert db.get(Comanda, comanda.id).estado == EstadoComanda.ABIERTA
    assert _estado_mesa(db, comanda.mesa_id) == "OCUPADA"


@pytest.mark.parametrize("estado", [EstadoComanda.CERRADA, EstadoComanda.ANULADA])
def test_cerrar_comanda_no_abierta_devuelve_409(
    cliente: TestClient,
    db: Session,
    comanda: Comanda,
    estado: EstadoComanda,
) -> None:
    comanda.estado = estado
    db.commit()

    respuesta = cliente.post(f"/api/v1/comandas/{comanda.id}/cerrar")

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": "Solo se puede cerrar una comanda ABIERTA"}
    db.expire_all()
    assert db.get(Comanda, comanda.id).estado == estado


def test_cerrar_comanda_pendiente_rechaza_con_metadatos_a02(
    cliente: TestClient,
    db: Session,
    comanda: Comanda,
) -> None:
    comanda.detalles[0].estado_entrega = EstadoEntrega.PENDIENTE
    db.commit()

    respuesta = cliente.post(f"/api/v1/comandas/{comanda.id}/cerrar")

    assert respuesta.status_code == 409
    assert respuesta.json()["detalle"] == "La comanda tiene productos pendientes de entrega"
    assert respuesta.json()["pendientes"][0]["id"] == comanda.detalles[0].id
    db.expire_all()
    assert db.get(Comanda, comanda.id).estado == EstadoComanda.ABIERTA
    assert comanda.detalles[0].estado_entrega == EstadoEntrega.PENDIENTE


@pytest.mark.parametrize("identificador", ["0", "-1", "abc", "1.5"])
def test_cerrar_comanda_id_invalido_devuelve_422(
    cliente: TestClient,
    identificador: str,
) -> None:
    respuesta = cliente.post(f"/api/v1/comandas/{identificador}/cerrar")

    assert respuesta.status_code == 422
    assert set(respuesta.json()) == {"detalle"}


@pytest.mark.parametrize("params", [{"limit": 0}, {"limit": 101}, {"offset": -1}])
def test_listar_clientes_paginacion_invalida(cliente_m4: TestClient, params: dict) -> None:
    respuesta = cliente_m4.get(RUTA, params=params)

    assert respuesta.status_code == 422
    assert list(params)[0] in respuesta.json()["detalle"]


# Alta de comanda con los adaptadores reales de salón y catálogo (HU-M4-04)

RUTA_COMANDAS = "/api/v1/comandas"


def _estado_mesa(db: Session, mesa_id: int) -> str:
    db.expire_all()
    return salon_service.obtener_mesa(db, mesa_id).estado


def test_crear_comanda_con_mesa_y_catalogo_reales_ocupa_la_mesa(
    cliente: TestClient, db: Session, salon
) -> None:
    pedido = {
        "mesa_id": salon.mesa_id,
        "detalles": [
            {"producto_id": salon.plato_id, "cantidad": 2},
            {"menu_ejecutivo_id": salon.menu_id, "cantidad": 1},
        ],
    }

    respuesta = cliente.post(RUTA_COMANDAS, json=pedido)

    assert respuesta.status_code == 201, respuesta.json()
    creada = respuesta.json()
    assert creada["mesa_id"] == salon.mesa_id
    assert creada["estado"] == "ABIERTA"
    assert [
        (d["producto_id"], d["menu_ejecutivo_id"], d["cantidad"], d["precio_unitario"])
        for d in creada["detalles"]
    ] == [(salon.plato_id, None, 2, "1500.50"), (None, salon.menu_id, 1, "4200.00")]
    assert {d["descuento"] for d in creada["detalles"]} == {"0.00"}
    assert {d["promocion_id"] for d in creada["detalles"]} == {None}
    assert {d["estado_entrega"] for d in creada["detalles"]} == {"PENDIENTE"}
    assert _estado_mesa(db, salon.mesa_id) == "OCUPADA"


def test_crear_comanda_mesa_inexistente_devuelve_404(cliente: TestClient, salon) -> None:
    pedido = {"mesa_id": 999, "detalles": [{"producto_id": salon.plato_id, "cantidad": 1}]}

    respuesta = cliente.post(RUTA_COMANDAS, json=pedido)

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detalle": "La mesa 999 no existe"}


def test_crear_comanda_mesa_con_comanda_abierta_devuelve_409(
    cliente: TestClient, db: Session, salon
) -> None:
    pedido = {
        "mesa_id": salon.mesa_id,
        "detalles": [{"producto_id": salon.plato_id, "cantidad": 1}],
    }
    creada = cliente.post(RUTA_COMANDAS, json=pedido)

    repetida = cliente.post(RUTA_COMANDAS, json=pedido)

    assert creada.status_code == 201
    assert repetida.status_code == 409
    assert repetida.json()["comanda_id"] == creada.json()["id"]
    assert cliente.get(f"{RUTA_COMANDAS}?mesa_id={salon.mesa_id}").json()["total"] == 1


def test_crear_comanda_mesa_fuera_de_servicio_devuelve_409(
    cliente: TestClient, db: Session, salon
) -> None:
    db.execute(
        text("UPDATE mesas SET estado='FUERA_DE_SERVICIO' WHERE id=:id"), {"id": salon.mesa_id}
    )
    db.commit()
    pedido = {
        "mesa_id": salon.mesa_id,
        "detalles": [{"producto_id": salon.plato_id, "cantidad": 1}],
    }

    respuesta = cliente.post(RUTA_COMANDAS, json=pedido)

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": "La mesa 10 no está libre"}


@pytest.mark.parametrize(
    "detalle,mensaje",
    [
        ({"producto_id": 999, "cantidad": 1}, "El producto 999 no existe"),
        ({"menu_ejecutivo_id": 999, "cantidad": 1}, "El menú ejecutivo 999 no existe"),
    ],
)
def test_crear_comanda_item_inexistente_devuelve_404_y_mesa_libre(
    cliente: TestClient, db: Session, salon, detalle: dict, mensaje: str
) -> None:
    respuesta = cliente.post(RUTA_COMANDAS, json={"mesa_id": salon.mesa_id, "detalles": [detalle]})

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detalle": mensaje}
    assert _estado_mesa(db, salon.mesa_id) == "LIBRE"
    assert cliente.get(RUTA_COMANDAS).json()["total"] == 0


@pytest.mark.parametrize("item", ["producto", "menu"])
def test_crear_comanda_item_deshabilitado_devuelve_409_y_mesa_libre(
    cliente: TestClient, db: Session, salon, item: str
) -> None:
    if item == "producto":
        productos_service.dar_de_baja_producto(db, Categoria.PLATO, salon.plato_id)
        detalle = {"producto_id": salon.plato_id, "cantidad": 1}
    else:
        menus_service.dar_de_baja_menu_ejecutivo(db, salon.menu_id)
        detalle = {"menu_ejecutivo_id": salon.menu_id, "cantidad": 1}

    respuesta = cliente.post(RUTA_COMANDAS, json={"mesa_id": salon.mesa_id, "detalles": [detalle]})

    assert respuesta.status_code == 409
    assert "está deshabilitado" in respuesta.json()["detalle"]
    assert _estado_mesa(db, salon.mesa_id) == "LIBRE"
    assert cliente.get(RUTA_COMANDAS).json()["total"] == 0


# Cierre de comanda con el adaptador real de salón: libera la mesa (HU-M4-09)


def _abrir_comanda(cliente: TestClient, salon) -> int:
    pedido = {
        "mesa_id": salon.mesa_id,
        "detalles": [{"producto_id": salon.plato_id, "cantidad": 1}],
    }
    respuesta = cliente.post(RUTA_COMANDAS, json=pedido)
    assert respuesta.status_code == 201, respuesta.json()
    return respuesta.json()["id"]


def _entregar_todo(db: Session, comanda_id: int) -> None:
    # Todavía no existe la operación de marcar entregas (HU-M4-07): se simula con SQL.
    db.execute(
        text("UPDATE detalles_comanda SET estado_entrega='ENTREGADO' WHERE comanda_id=:id"),
        {"id": comanda_id},
    )
    db.commit()


def test_cerrar_comanda_con_salon_real_libera_la_mesa(
    cliente: TestClient, db: Session, salon
) -> None:
    comanda_id = _abrir_comanda(cliente, salon)
    _entregar_todo(db, comanda_id)

    respuesta = cliente.post(f"{RUTA_COMANDAS}/{comanda_id}/cerrar")

    assert respuesta.status_code == 200, respuesta.json()
    assert respuesta.json()["estado"] == "CERRADA"
    assert _estado_mesa(db, salon.mesa_id) == "LIBRE"


def test_cerrar_comanda_permite_nueva_comanda_en_la_mesa(
    cliente: TestClient, db: Session, salon
) -> None:
    primera = _abrir_comanda(cliente, salon)
    _entregar_todo(db, primera)
    assert cliente.post(f"{RUTA_COMANDAS}/{primera}/cerrar").status_code == 200

    pedido = {
        "mesa_id": salon.mesa_id,
        "detalles": [{"producto_id": salon.plato_id, "cantidad": 2}],
    }
    nueva = cliente.post(RUTA_COMANDAS, json=pedido)

    assert nueva.status_code == 201, nueva.json()
    assert nueva.json()["estado"] == "ABIERTA"
    assert nueva.json()["id"] != primera
    assert _estado_mesa(db, salon.mesa_id) == "OCUPADA"
    assert cliente.get(f"{RUTA_COMANDAS}?mesa_id={salon.mesa_id}").json()["total"] == 2


def test_cerrar_comanda_con_pendientes_deja_la_mesa_ocupada(
    cliente: TestClient, db: Session, salon
) -> None:
    comanda_id = _abrir_comanda(cliente, salon)

    respuesta = cliente.post(f"{RUTA_COMANDAS}/{comanda_id}/cerrar")

    assert respuesta.status_code == 409
    assert respuesta.json()["detalle"] == "La comanda tiene productos pendientes de entrega"
    assert _estado_mesa(db, salon.mesa_id) == "OCUPADA"


def test_cerrar_comanda_dos_veces_no_libera_la_mesa_de_otra_comanda(
    cliente: TestClient, db: Session, salon
) -> None:
    primera = _abrir_comanda(cliente, salon)
    _entregar_todo(db, primera)
    assert cliente.post(f"{RUTA_COMANDAS}/{primera}/cerrar").status_code == 200
    _abrir_comanda(cliente, salon)

    repetida = cliente.post(f"{RUTA_COMANDAS}/{primera}/cerrar")

    assert repetida.status_code == 409
    assert repetida.json() == {"detalle": "Solo se puede cerrar una comanda ABIERTA"}
    assert _estado_mesa(db, salon.mesa_id) == "OCUPADA"


# Entregas por cantidad (HU-M4-08)


def _ruta_entrega(comanda: Comanda, indice: int = 0) -> str:
    return f"/api/v1/comandas/{comanda.id}/detalles/{comanda.detalles[indice].id}/entrega"


def _linea(respuesta, detalle) -> dict:
    return next(d for d in respuesta.json()["detalles"] if d["id"] == detalle.id)


def test_put_entrega_parcial_responde_200_con_forma(
    cliente: TestClient, comanda_con_lineas: Comanda
) -> None:
    respuesta = cliente.put(_ruta_entrega(comanda_con_lineas, 1), json={"cantidad_entregada": 4})

    assert respuesta.status_code == 200
    segundo = comanda_con_lineas.detalles[1]
    assert respuesta.json()["comanda_id"] == comanda_con_lineas.id
    assert respuesta.json()["estado"] == "ABIERTA"
    assert _linea(respuesta, segundo) == {
        "id": segundo.id,
        "producto_id": 1,
        "menu_ejecutivo_id": None,
        "cantidad": 10,
        "cantidad_entregada": 4,
        "estado_entrega": "PENDIENTE",
    }
    listado = cliente.get(f"/api/v1/comandas/{comanda_con_lineas.id}/detalles")
    assert _linea(listado, segundo)["cantidad_entregada"] == 4


def test_put_entrega_completa_responde_200_entregado(
    cliente: TestClient, comanda_con_lineas: Comanda
) -> None:
    respuesta = cliente.put(_ruta_entrega(comanda_con_lineas), json={"cantidad_entregada": 3})

    assert respuesta.status_code == 200
    primero, segundo = comanda_con_lineas.detalles
    assert _linea(respuesta, primero)["estado_entrega"] == "ENTREGADO"
    assert _linea(respuesta, primero)["cantidad_entregada"] == 3
    assert _linea(respuesta, segundo)["estado_entrega"] == "PENDIENTE"
    assert _linea(respuesta, segundo)["cantidad_entregada"] == 0


@pytest.mark.parametrize("valor", [2, 0])
def test_put_entrega_desmarcar_y_fijar_cero_responde_200(
    cliente: TestClient, comanda_con_lineas: Comanda, valor: int
) -> None:
    cliente.put(_ruta_entrega(comanda_con_lineas), json={"cantidad_entregada": 3})

    respuesta = cliente.put(_ruta_entrega(comanda_con_lineas), json={"cantidad_entregada": valor})

    assert respuesta.status_code == 200
    linea = _linea(respuesta, comanda_con_lineas.detalles[0])
    assert (linea["cantidad_entregada"], linea["estado_entrega"]) == (valor, "PENDIENTE")


def test_put_entrega_repetida_responde_200_igual(
    cliente: TestClient, comanda_con_lineas: Comanda
) -> None:
    primera = cliente.put(_ruta_entrega(comanda_con_lineas, 1), json={"cantidad_entregada": 4})
    segunda = cliente.put(_ruta_entrega(comanda_con_lineas, 1), json={"cantidad_entregada": 4})

    assert segunda.status_code == 200
    assert segunda.json() == primera.json()


def test_put_entrega_cantidad_mayor_responde_422_con_detalle(
    cliente: TestClient, comanda_con_lineas: Comanda
) -> None:
    respuesta = cliente.put(_ruta_entrega(comanda_con_lineas), json={"cantidad_entregada": 4})

    assert respuesta.status_code == 422
    assert set(respuesta.json()) == {"detalle"}
    assert "3" in respuesta.json()["detalle"]


@pytest.mark.parametrize(
    "cuerpo",
    [
        {"cantidad_entregada": -1},
        {"cantidad_entregada": "2"},
        {"cantidad_entregada": 2.5},
        {"cantidad_entregada": None},
        {},
        {"cantidad_entregada": 1, "otro": 1},
    ],
    ids=["negativo", "texto", "decimal", "nulo", "vacio", "extra"],
)
def test_put_entrega_cuerpo_invalido_responde_422(
    cliente: TestClient, comanda_con_lineas: Comanda, cuerpo: dict
) -> None:
    respuesta = cliente.put(_ruta_entrega(comanda_con_lineas), json=cuerpo)

    assert respuesta.status_code == 422
    assert set(respuesta.json()) == {"detalle"}
    detalle = cliente.get(f"/api/v1/comandas/{comanda_con_lineas.id}/detalles")
    assert _linea(detalle, comanda_con_lineas.detalles[0])["cantidad_entregada"] == 0


@pytest.mark.parametrize(
    ("comanda_id", "detalle_id"), [("0", "1"), ("1", "0"), ("abc", "1"), ("1", "abc")]
)
def test_put_entrega_id_cero_o_no_numerico_responde_422(
    cliente: TestClient, comanda_id: str, detalle_id: str
) -> None:
    respuesta = cliente.put(
        f"/api/v1/comandas/{comanda_id}/detalles/{detalle_id}/entrega",
        json={"cantidad_entregada": 1},
    )

    assert respuesta.status_code == 422
    assert set(respuesta.json()) == {"detalle"}


def test_put_entrega_comanda_inexistente_responde_404(
    cliente: TestClient, comanda_con_lineas: Comanda
) -> None:
    respuesta = cliente.put(
        f"/api/v1/comandas/999/detalles/{comanda_con_lineas.detalles[0].id}/entrega",
        json={"cantidad_entregada": 1},
    )

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detalle": "La comanda 999 no existe"}


def test_put_entrega_detalle_de_otra_comanda_responde_404(
    cliente: TestClient, comanda: Comanda, comanda_con_lineas: Comanda
) -> None:
    ajeno = comanda.detalles[0].id

    respuesta = cliente.put(
        f"/api/v1/comandas/{comanda_con_lineas.id}/detalles/{ajeno}/entrega",
        json={"cantidad_entregada": 1},
    )

    assert respuesta.status_code == 404
    assert set(respuesta.json()) == {"detalle"}


@pytest.mark.parametrize("estado", [EstadoComanda.CERRADA, EstadoComanda.ANULADA])
def test_put_entrega_comanda_cerrada_o_anulada_responde_409(
    cliente: TestClient, db: Session, comanda_con_lineas: Comanda, estado: EstadoComanda
) -> None:
    comanda_con_lineas.estado = estado
    db.commit()

    respuesta = cliente.put(_ruta_entrega(comanda_con_lineas), json={"cantidad_entregada": 1})

    assert respuesta.status_code == 409
    assert set(respuesta.json()) == {"detalle"}


def test_get_detalles_responde_200_con_cantidades_ordenadas(
    cliente: TestClient, comanda_con_lineas: Comanda
) -> None:
    cliente.put(_ruta_entrega(comanda_con_lineas), json={"cantidad_entregada": 3})
    cliente.put(_ruta_entrega(comanda_con_lineas, 1), json={"cantidad_entregada": 2})

    respuesta = cliente.get(f"/api/v1/comandas/{comanda_con_lineas.id}/detalles")

    assert respuesta.status_code == 200
    assert [
        (d["cantidad"], d["cantidad_entregada"], d["estado_entrega"])
        for d in respuesta.json()["detalles"]
    ] == [(3, 3, "ENTREGADO"), (10, 2, "PENDIENTE")]
    ids = [d["id"] for d in respuesta.json()["detalles"]]
    assert ids == sorted(ids)


def test_get_detalles_todo_entregado_y_pendientes_vacio(
    cliente: TestClient, comanda_con_lineas: Comanda
) -> None:
    cliente.put(_ruta_entrega(comanda_con_lineas), json={"cantidad_entregada": 3})
    cliente.put(_ruta_entrega(comanda_con_lineas, 1), json={"cantidad_entregada": 10})

    respuesta = cliente.get(f"/api/v1/comandas/{comanda_con_lineas.id}/detalles")
    pendientes = cliente.get(f"/api/v1/comandas/{comanda_con_lineas.id}/pendientes")

    assert [d["estado_entrega"] for d in respuesta.json()["detalles"]] == ["ENTREGADO"] * 2
    assert pendientes.json()["pendientes"] == []


def test_get_detalles_comanda_cerrada_responde_200(
    cliente: TestClient, db: Session, comanda: Comanda
) -> None:
    comanda.estado = EstadoComanda.CERRADA
    db.commit()

    respuesta = cliente.get(f"/api/v1/comandas/{comanda.id}/detalles")

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "CERRADA"
    assert len(respuesta.json()["detalles"]) == 1


def test_get_detalles_inexistente_responde_404_e_id_invalido_422(cliente: TestClient) -> None:
    inexistente = cliente.get("/api/v1/comandas/999/detalles")
    invalido = cliente.get("/api/v1/comandas/0/detalles")

    assert inexistente.status_code == 404
    assert inexistente.json() == {"detalle": "La comanda 999 no existe"}
    assert invalido.status_code == 422


def test_ciclo_entregar_todo_y_cerrar_responde_200(cliente: TestClient, db: Session, salon) -> None:
    comanda_id = _abrir_comanda(cliente, salon)
    detalle = cliente.get(f"/api/v1/comandas/{comanda_id}/detalles").json()["detalles"][0]
    assert cliente.post(f"/api/v1/comandas/{comanda_id}/cerrar").status_code == 409

    entrega = cliente.put(
        f"/api/v1/comandas/{comanda_id}/detalles/{detalle['id']}/entrega",
        json={"cantidad_entregada": detalle["cantidad"]},
    )
    cierre = cliente.post(f"/api/v1/comandas/{comanda_id}/cerrar")

    assert entrega.status_code == 200
    assert cierre.status_code == 200
    assert cierre.json()["estado"] == "CERRADA"
    assert _estado_mesa(db, salon.mesa_id) == "LIBRE"


def test_ciclo_desmarcar_una_unidad_y_cerrar_responde_409(
    cliente: TestClient, db: Session, salon
) -> None:
    comanda_id = _abrir_comanda(cliente, salon)
    detalle = cliente.get(f"/api/v1/comandas/{comanda_id}/detalles").json()["detalles"][0]
    ruta = f"/api/v1/comandas/{comanda_id}/detalles/{detalle['id']}/entrega"
    cliente.put(ruta, json={"cantidad_entregada": detalle["cantidad"]})
    cliente.put(ruta, json={"cantidad_entregada": detalle["cantidad"] - 1})

    cierre = cliente.post(f"/api/v1/comandas/{comanda_id}/cerrar")

    assert cierre.status_code == 409
    assert cierre.json()["pendientes"][0]["id"] == detalle["id"]
    assert _estado_mesa(db, salon.mesa_id) == "OCUPADA"
