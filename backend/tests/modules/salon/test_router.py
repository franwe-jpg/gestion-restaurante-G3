"""Pruebas del router de sectores (HU-M3-01)."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.salon.models import Mesa, Sector
from app.shared.models import Estado

RUTA = "/api/v1/sectores"


def _cantidad_sectores(db: Session) -> int:
    return len(db.scalars(select(Sector)).all())


# CA 1, CA 5 y CA 6
def test_crear_sector_responde_201_con_la_forma_de_sector_salida(cliente: TestClient) -> None:
    respuesta = cliente.post(RUTA, json={"nombre": "  Salón principal  "})

    assert respuesta.status_code == 201
    assert respuesta.json() == {
        "id": 1,
        "nombre": "Salón principal",
        "descripcion": None,
        "estado": "HABILITADO",
    }


def test_crear_sector_con_descripcion_responde_201(cliente: TestClient) -> None:
    respuesta = cliente.post(RUTA, json={"nombre": "Terraza", "descripcion": "Al aire libre"})

    assert respuesta.status_code == 201
    assert respuesta.json()["descripcion"] == "Al aire libre"
    assert respuesta.json()["estado"] == "HABILITADO"


def test_crear_sector_con_30_caracteres_responde_201(cliente: TestClient) -> None:
    respuesta = cliente.post(RUTA, json={"nombre": "a" * 30})

    assert respuesta.status_code == 201


# CA 2, CA 5, CA 6 y descripcion
@pytest.mark.parametrize(
    "cuerpo, campo",
    [
        ({}, "nombre"),
        ({"nombre": ""}, "nombre"),
        ({"nombre": "   "}, "nombre"),
        ({"nombre": "a" * 31}, "nombre"),
        ({"nombre": "Terraza", "descripcion": "a" * 201}, "descripcion"),
        ({"nombre": "Terraza", "estado": "DESHABILITADO"}, "estado"),
    ],
    ids=["sin-nombre", "vacio", "solo-espacios", "31-caracteres", "descripcion-201", "estado"],
)
def test_crear_sector_con_datos_invalidos_responde_422_sin_guardar(
    cliente: TestClient, db: Session, cuerpo: dict, campo: str
) -> None:
    respuesta = cliente.post(RUTA, json=cuerpo)

    assert respuesta.status_code == 422
    assert campo in respuesta.json()["detalle"]
    assert _cantidad_sectores(db) == 0


# CA 3
def test_crear_sector_con_nombre_repetido_responde_409_con_detalle(cliente: TestClient) -> None:
    cliente.post(RUTA, json={"nombre": "Salón principal"})

    respuesta = cliente.post(RUTA, json={"nombre": "  salón PRINCIPAL "})

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": "El sector ya existe"}
    assert cliente.post(RUTA, json={"nombre": "Terraza"}).status_code == 201


# Preserva las rutas registradas antes de sumar el router del salon
def test_registrar_el_router_del_salon_conserva_las_rutas_existentes(
    cliente: TestClient,
) -> None:
    assert cliente.get("/api/v1/salud").json() == {"estado": "ok"}
    assert cliente.get("/api/v1/secciones").status_code == 200


# --- HU-M3-05: alta de mesas y lectura de apoyo de sectores ---

RUTA_MESAS = "/api/v1/mesas"
RUTA_SECTORES = "/api/v1/sectores"


def _cantidad_mesas(db: Session) -> int:
    return len(db.scalars(select(Mesa)).all())


def _cuerpo_mesa(sector_id: int, numero: int = 13, capacidad: int = 4) -> dict:
    return {"numero": numero, "capacidad": capacidad, "sector_id": sector_id}


# CA 1 y CA 7
def test_crear_mesa_responde_201_con_la_forma_de_mesa_salida(
    cliente: TestClient, fabrica_sector
) -> None:
    sector = fabrica_sector()

    respuesta = cliente.post(RUTA_MESAS, json=_cuerpo_mesa(sector.id))

    assert respuesta.status_code == 201
    assert respuesta.json() == {
        "id": 1,
        "numero": 13,
        "capacidad": 4,
        "sector": {"id": sector.id, "nombre": "Salón principal"},
        "estado": "LIBRE",
    }


# CA 2, CA 5, CA 6 y CA 7
@pytest.mark.parametrize(
    "cuerpo, campo",
    [
        ({}, "numero"),
        ({"numero": 13, "sector_id": 1}, "capacidad"),
        ({"numero": 13, "capacidad": 4}, "sector_id"),
        ({"numero": 0, "capacidad": 4, "sector_id": 1}, "numero"),
        ({"numero": -1, "capacidad": 4, "sector_id": 1}, "numero"),
        ({"numero": "3", "capacidad": 4, "sector_id": 1}, "numero"),
        ({"numero": 2.0, "capacidad": 4, "sector_id": 1}, "numero"),
        ({"numero": True, "capacidad": 4, "sector_id": 1}, "numero"),
        ({"numero": 13, "capacidad": 0, "sector_id": 1}, "capacidad"),
        ({"numero": 13, "capacidad": -1, "sector_id": 1}, "capacidad"),
        ({"numero": 13, "capacidad": "4", "sector_id": 1}, "capacidad"),
        ({"numero": 13, "capacidad": 2.0, "sector_id": 1}, "capacidad"),
        ({"numero": 13, "capacidad": True, "sector_id": 1}, "capacidad"),
        ({"numero": 13, "capacidad": 4, "sector_id": 0}, "sector_id"),
        ({"numero": 13, "capacidad": 4, "sector_id": -1}, "sector_id"),
        ({"numero": 13, "capacidad": 4, "sector_id": 1, "estado": "OCUPADA"}, "estado"),
    ],
    ids=[
        "sin-campos",
        "sin-capacidad",
        "sin-sector",
        "numero-cero",
        "numero-negativo",
        "numero-texto",
        "numero-decimal",
        "numero-booleano",
        "capacidad-cero",
        "capacidad-negativa",
        "capacidad-texto",
        "capacidad-decimal",
        "capacidad-booleana",
        "sector-cero",
        "sector-negativo",
        "estado",
    ],
)
def test_crear_mesa_con_datos_invalidos_responde_422_sin_guardar(
    cliente: TestClient, db: Session, cuerpo: dict, campo: str
) -> None:
    respuesta = cliente.post(RUTA_MESAS, json=cuerpo)

    assert respuesta.status_code == 422
    assert campo in respuesta.json()["detalle"]
    assert _cantidad_mesas(db) == 0


def test_crear_mesa_con_sector_inexistente_responde_404(cliente: TestClient, db: Session) -> None:
    respuesta = cliente.post(RUTA_MESAS, json=_cuerpo_mesa(sector_id=99))

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detalle": "El sector 99 no existe"}
    assert _cantidad_mesas(db) == 0


# CA 3
def test_crear_mesa_repetida_en_el_sector_responde_409_con_detalle(
    cliente: TestClient, db: Session, fabrica_sector, fabrica_mesa
) -> None:
    sector = fabrica_sector()
    fabrica_mesa(sector, numero=3)

    respuesta = cliente.post(RUTA_MESAS, json=_cuerpo_mesa(sector.id, numero=3))

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": "La mesa 3 ya existe en el sector Salón principal"}
    assert _cantidad_mesas(db) == 1


# CA 3, limite
def test_crear_el_mismo_numero_en_otro_sector_responde_201(
    cliente: TestClient, fabrica_sector, fabrica_mesa
) -> None:
    salon = fabrica_sector("Salón principal")
    terraza = fabrica_sector("Terraza")
    fabrica_mesa(salon, numero=3)

    respuesta = cliente.post(RUTA_MESAS, json=_cuerpo_mesa(terraza.id, numero=3))

    assert respuesta.status_code == 201
    assert respuesta.json()["sector"]["nombre"] == "Terraza"


def test_crear_mesa_en_un_sector_deshabilitado_responde_409(
    cliente: TestClient, db: Session, fabrica_sector
) -> None:
    sector = fabrica_sector("Entradas", estado=Estado.DESHABILITADO)

    respuesta = cliente.post(RUTA_MESAS, json=_cuerpo_mesa(sector.id))

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": "El sector Entradas está deshabilitado"}
    assert _cantidad_mesas(db) == 0


# --- GET /sectores ---


def test_listar_sectores_filtra_por_estado_y_cuenta_solo_los_filtrados(
    cliente: TestClient, fabrica_sector
) -> None:
    fabrica_sector("Terraza")
    fabrica_sector("Patio")
    fabrica_sector("Entradas", estado=Estado.DESHABILITADO)

    respuesta = cliente.get(f"{RUTA_SECTORES}?estado=HABILITADO&limit=100&offset=0")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert [sector["nombre"] for sector in cuerpo["items"]] == ["Patio", "Terraza"]
    assert cuerpo["total"] == 2
    assert cuerpo["limit"] == 100
    assert cuerpo["offset"] == 0


def test_listar_sectores_sin_filtro_devuelve_todos(cliente: TestClient, fabrica_sector) -> None:
    fabrica_sector("Terraza")
    fabrica_sector("Entradas", estado=Estado.DESHABILITADO)

    respuesta = cliente.get(RUTA_SECTORES)

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert [sector["nombre"] for sector in cuerpo["items"]] == ["Entradas", "Terraza"]
    assert cuerpo["total"] == 2


@pytest.mark.parametrize(
    "consulta",
    ["limit=101", "offset=-1", "estado=ABIERTO"],
    ids=["limit-101", "offset-negativo", "estado-invalido"],
)
def test_listar_sectores_con_parametros_invalidos_responde_422(
    cliente: TestClient, consulta: str
) -> None:
    respuesta = cliente.get(f"{RUTA_SECTORES}?{consulta}")

    assert respuesta.status_code == 422
    assert "detalle" in respuesta.json()


# --- GET /mesas (HU-M3-08, traida desde `main`; ver repository.listar_mesas) ---


def test_listar_mesas_devuelve_las_mesas_con_su_sector(
    cliente: TestClient, fabrica_sector, fabrica_mesa
) -> None:
    sector = fabrica_sector("Terraza")
    fabrica_mesa(sector, numero=1)

    respuesta = cliente.get(RUTA_MESAS)

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["items"] == [
        {
            "id": 1,
            "numero": 1,
            "capacidad": 4,
            "sector": {"id": sector.id, "nombre": "Terraza"},
            "estado": "LIBRE",
        }
    ]
    assert cuerpo["total"] == 1


def test_listar_mesas_con_parametros_invalidos_responde_422(cliente: TestClient) -> None:
    respuesta = cliente.get(f"{RUTA_MESAS}?limit=101")

    assert respuesta.status_code == 422
    assert "detalle" in respuesta.json()
