"""Pruebas del router de medios de pago (HU-M6-04 a HU-M6-07)."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.pagos.models import MedioPago, TipoMedioPago
from app.shared.models import Estado

RUTA = "/api/v1/medios-de-pago"


def _cuerpo(**datos: object) -> dict[str, object]:
    return {"nombre": "Efectivo", "tipo": "EFECTIVO", **datos}


# --- POST (#74) ---


# CA 1 y CA 8 de #74
def test_crear_responde_201_con_medio_pago_salida(cliente: TestClient) -> None:
    respuesta = cliente.post(RUTA, json=_cuerpo(nombre="  Efectivo  ", descripcion="Caja"))

    assert respuesta.status_code == 201
    assert respuesta.json() == {
        "id": 1,
        "nombre": "Efectivo",
        "tipo": "EFECTIVO",
        "descripcion": "Caja",
        "estado": "HABILITADO",
    }


# CA 2 y CA 9 de #74
def test_crear_con_nombre_repetido_responde_409(cliente: TestClient, fabrica_medio_pago) -> None:
    fabrica_medio_pago("Efectivo")

    respuesta = cliente.post(RUTA, json=_cuerpo(nombre="efectivo "))

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": "El medio de pago ya existe"}


# CA 3 a CA 8 de #74
@pytest.mark.parametrize(
    "cuerpo",
    [
        _cuerpo(nombre=""),
        _cuerpo(nombre="ab"),
        _cuerpo(nombre="a" * 51),
        _cuerpo(nombre="Tarjeta $"),
        {"nombre": "Efectivo"},
        _cuerpo(tipo="CHEQUE"),
        _cuerpo(descripcion="a" * 201),
        _cuerpo(estado="DESHABILITADO"),
    ],
    ids=["vacio", "corto", "largo", "caracteres", "sin-tipo", "tipo", "descripcion", "estado"],
)
def test_crear_con_datos_invalidos_responde_422(
    cliente: TestClient, db: Session, cuerpo: dict[str, object]
) -> None:
    respuesta = cliente.post(RUTA, json=cuerpo)

    assert respuesta.status_code == 422
    assert list(respuesta.json()) == ["detalle"]
    assert db.query(MedioPago).count() == 0


# --- PUT (#75) ---


# CA 1 y CA 9 de #75
def test_modificar_responde_200_con_los_datos_nuevos(
    cliente: TestClient, fabrica_medio_pago
) -> None:
    medio = fabrica_medio_pago("Tarjeta", TipoMedioPago.TARJETA)

    respuesta = cliente.put(
        f"{RUTA}/{medio.id}",
        json=_cuerpo(nombre="Tarjeta de crédito", tipo="TARJETA", estado="DESHABILITADO"),
    )

    assert respuesta.status_code == 200
    assert respuesta.json() == {
        "id": medio.id,
        "nombre": "Tarjeta de crédito",
        "tipo": "TARJETA",
        "descripcion": None,
        "estado": "DESHABILITADO",
    }


# CA 5 de #75
def test_modificar_con_nombre_de_otro_medio_responde_409(
    cliente: TestClient, fabrica_medio_pago
) -> None:
    fabrica_medio_pago("Efectivo")
    tarjeta = fabrica_medio_pago("Tarjeta", TipoMedioPago.TARJETA)

    respuesta = cliente.put(
        f"{RUTA}/{tarjeta.id}", json=_cuerpo(nombre=" EFECTIVO ", estado="HABILITADO")
    )

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": "El medio de pago ya existe"}


# CA 2, 3, 4, 7 y 8 de #75
@pytest.mark.parametrize(
    "cuerpo",
    [
        _cuerpo(nombre="", estado="HABILITADO"),
        _cuerpo(nombre="ab", estado="HABILITADO"),
        _cuerpo(nombre="Tarjeta $", estado="HABILITADO"),
        {"nombre": "Efectivo", "estado": "HABILITADO"},
        _cuerpo(descripcion="a" * 201, estado="HABILITADO"),
        _cuerpo(),
    ],
    ids=["vacio", "corto", "caracteres", "sin-tipo", "descripcion", "sin-estado"],
)
def test_modificar_con_datos_invalidos_responde_422_y_no_cambia(
    cliente: TestClient, db: Session, fabrica_medio_pago, cuerpo: dict[str, object]
) -> None:
    medio = fabrica_medio_pago("Efectivo", descripcion="Caja")

    respuesta = cliente.put(f"{RUTA}/{medio.id}", json=cuerpo)

    assert respuesta.status_code == 422
    db.refresh(medio)
    assert (medio.nombre, medio.descripcion) == ("Efectivo", "Caja")


# CA 11 de #75
def test_modificar_medio_eliminado_responde_404(cliente: TestClient, fabrica_medio_pago) -> None:
    medio = fabrica_medio_pago("Efectivo", eliminado=True)

    respuesta = cliente.put(f"{RUTA}/{medio.id}", json=_cuerpo(estado="HABILITADO"))

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detalle": f"El medio de pago {medio.id} no existe"}


# --- DELETE (#76) ---


# CA 1 de #76
def test_eliminar_responde_204_y_deja_de_listarse(cliente: TestClient, fabrica_medio_pago) -> None:
    medio = fabrica_medio_pago("Efectivo")

    respuesta = cliente.delete(f"{RUTA}/{medio.id}")

    assert respuesta.status_code == 204
    assert respuesta.content == b""
    assert cliente.get(RUTA).json()["items"] == []


# CA 4 de #76
def test_eliminar_de_nuevo_responde_404(cliente: TestClient, fabrica_medio_pago) -> None:
    medio = fabrica_medio_pago("Efectivo")
    cliente.delete(f"{RUTA}/{medio.id}")

    respuesta = cliente.delete(f"{RUTA}/{medio.id}")

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detalle": f"El medio de pago {medio.id} no existe"}


# --- GET (#77) ---


# CA 1, CA 2 y CA 4 de #77
def test_listar_responde_habilitados_ordenados_por_nombre(
    cliente: TestClient, fabrica_medio_pago
) -> None:
    fabrica_medio_pago("tarjeta", TipoMedioPago.TARJETA)
    fabrica_medio_pago("Efectivo")
    fabrica_medio_pago("Deshabilitado", TipoMedioPago.TARJETA, estado=Estado.DESHABILITADO)
    fabrica_medio_pago("Eliminado", TipoMedioPago.TARJETA, eliminado=True)

    cuerpo = cliente.get(RUTA).json()

    assert [(medio["nombre"], medio["tipo"]) for medio in cuerpo["items"]] == [
        ("Efectivo", "EFECTIVO"),
        ("tarjeta", "TARJETA"),
    ]
    assert (cuerpo["total"], cuerpo["limit"], cuerpo["offset"]) == (2, 50, 0)


# CA 3 de #77
def test_listar_sin_habilitados_responde_200_vacio(cliente: TestClient) -> None:
    respuesta = cliente.get(RUTA)

    assert respuesta.status_code == 200
    assert respuesta.json() == {"items": [], "total": 0, "limit": 50, "offset": 0}


# S2
def test_listar_con_deshabilitados(cliente: TestClient, fabrica_medio_pago) -> None:
    fabrica_medio_pago("Efectivo")
    fabrica_medio_pago("Tarjeta", TipoMedioPago.TARJETA, estado=Estado.DESHABILITADO)

    cuerpo = cliente.get(RUTA, params={"incluir_deshabilitados": "true"}).json()

    assert [medio["estado"] for medio in cuerpo["items"]] == ["HABILITADO", "DESHABILITADO"]


def test_listar_con_limit_mayor_a_100_responde_422(cliente: TestClient) -> None:
    assert cliente.get(RUTA, params={"limit": 101}).status_code == 422
