"""Contrato HTTP del listado y del cierre exclusivamente local de M4."""

from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.atencion.models import Comanda
from app.shared.contratos.comanda import ComandaSalida, EstadoComanda, EstadoEntrega


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
            "producto_id": 1,
            "menu_ejecutivo_id": None,
            "cantidad": 2,
            "precio_unitario": "29.90",
            "descuento": "3.25",
            "promocion_id": 8,
            "estado_entrega": "ENTREGADO",
        }
    ]
    segunda = cliente.post(f"/api/v1/comandas/{comanda.id}/cerrar")
    assert segunda.status_code == 409
    assert set(segunda.json()) == {"detalle"}
    db.expire_all()
    assert db.get(Comanda, comanda.id).estado == EstadoComanda.CERRADA


def test_cerrar_comanda_inexistente_devuelve_404(cliente: TestClient, comanda: Comanda) -> None:
    respuesta = cliente.post("/api/v1/comandas/999/cerrar")

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detalle": "La comanda 999 no existe"}


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
