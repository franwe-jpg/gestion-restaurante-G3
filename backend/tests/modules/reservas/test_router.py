"""Pruebas del router de reservas: alta (HU-M5-01), consulta y modificacion (HU-M5-02), listado."""

from datetime import date, time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.main import app
from app.modules.reservas.models import EstadoReserva, Reserva
from app.shared.models.enums import EstadoMesa

RUTA = "/api/v1/reservas"
# El reloj de las pruebas (conftest.py) marca el 2026-11-02 a las 12:00.
CUERPO = {
    "mesa_id": 5,
    "cliente_id": 7,
    "fecha": "2026-11-02",
    "hora": "21:30",
    "cantidad_personas": 4,
}
TURNO_OCUPADO = "La mesa 5 ya tiene una reserva activa el 2026-11-02 a las 21:30"


def _cantidad_reservas(db: Session) -> int:
    return len(db.scalars(select(Reserva)).all())


# HU-M5-01 CA 1 y CA 2
def test_post_reservas_crea_y_devuelve_201(cliente: TestClient, db: Session) -> None:
    respuesta = cliente.post(RUTA, json=CUERPO)

    assert respuesta.status_code == 201
    assert respuesta.json() == {
        "id": 1,
        "mesa_id": 5,
        "cliente_id": 7,
        "fecha": "2026-11-02",
        "hora": "21:30",
        "cantidad_personas": 4,
        "estado": "ACTIVA",
    }
    guardada = db.get(Reserva, 1)
    assert guardada.hora == time(21, 30)
    assert guardada.fecha == date(2026, 11, 2)
    assert _cantidad_reservas(db) == 1


# CA 6, limite
def test_post_reservas_alta_para_hoy_con_hora_posterior_devuelve_201(cliente: TestClient) -> None:
    respuesta = cliente.post(RUTA, json=CUERPO | {"hora": "12:01"})

    assert respuesta.status_code == 201
    assert respuesta.json()["hora"] == "12:01"


# CA 9
def test_post_reservas_turno_ocupado_devuelve_409_con_detalle(
    cliente: TestClient, db: Session, fabrica_reserva
) -> None:
    fabrica_reserva(mesa_id=5, fecha=date(2026, 11, 2), hora=time(21, 30))

    respuesta = cliente.post(RUTA, json=CUERPO | {"cliente_id": 8})

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": TURNO_OCUPADO}
    assert _cantidad_reservas(db) == 1


# CA 5
def test_post_reservas_fecha_pasada_devuelve_422(cliente: TestClient, db: Session) -> None:
    respuesta = cliente.post(RUTA, json=CUERPO | {"fecha": "2026-11-01"})

    assert respuesta.status_code == 422
    assert respuesta.json() == {"detalle": "La fecha de la reserva no puede ser anterior a hoy"}
    assert _cantidad_reservas(db) == 0


# CA 6, limite
def test_post_reservas_hora_pasada_hoy_devuelve_422(cliente: TestClient, db: Session) -> None:
    respuesta = cliente.post(RUTA, json=CUERPO | {"hora": "12:00"})

    assert respuesta.status_code == 422
    assert respuesta.json() == {
        "detalle": "La hora de la reserva debe ser posterior a la hora actual"
    }
    assert _cantidad_reservas(db) == 0


# CA 4
def test_post_reservas_mesa_inexistente_devuelve_404(
    cliente: TestClient, db: Session, puente_sin_mesa
) -> None:
    respuesta = cliente.post(RUTA, json=CUERPO | {"mesa_id": 99})

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detalle": "La mesa 99 no existe"}
    assert _cantidad_reservas(db) == 0


# S31 (issue #61): una mesa fuera de servicio es un 409 con el formato de siempre
def test_post_reservas_mesa_fuera_de_servicio_devuelve_409_con_detalle(
    cliente: TestClient, db: Session, puente_doble
) -> None:
    puente_doble.poner(6, estado=EstadoMesa.FUERA_DE_SERVICIO)

    respuesta = cliente.post(RUTA, json=CUERPO | {"mesa_id": 6})

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": "La mesa 6 está fuera de servicio"}
    assert _cantidad_reservas(db) == 0


# S17: la forma se valida primero, aunque la mesa este fuera de servicio
def test_post_reservas_mesa_fuera_de_servicio_con_forma_invalida_devuelve_422(
    cliente: TestClient, db: Session, puente_doble
) -> None:
    puente_doble.poner(6, estado=EstadoMesa.FUERA_DE_SERVICIO)
    cuerpo = {k: v for k, v in CUERPO.items() if k != "fecha"}

    respuesta = cliente.post(RUTA, json=cuerpo | {"mesa_id": 6})

    assert respuesta.status_code == 422
    assert "fecha" in respuesta.json()["detalle"]
    assert _cantidad_reservas(db) == 0


# S30: una mesa ocupada ahora se puede reservar para otro turno
def test_post_reservas_mesa_ocupada_devuelve_201(
    cliente: TestClient, db: Session, puente_doble
) -> None:
    puente_doble.poner(5, estado=EstadoMesa.OCUPADA)

    respuesta = cliente.post(RUTA, json=CUERPO | {"fecha": "2026-11-03"})

    assert respuesta.status_code == 201
    assert respuesta.json()["estado"] == "ACTIVA"
    assert _cantidad_reservas(db) == 1


def test_post_reservas_cliente_inexistente_devuelve_404(
    cliente: TestClient, db: Session, puente_sin_cliente
) -> None:
    respuesta = cliente.post(RUTA, json=CUERPO | {"cliente_id": 99})

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detalle": "El cliente 99 no existe"}
    assert _cantidad_reservas(db) == 0


# S33 (issue #61): con el puente real, la mesa sale de M3
def test_puente_real_alta_en_una_mesa_de_m3_devuelve_201(
    cliente: TestClient, db: Session, puente_real, mesas_en_m3
) -> None:
    mesa = mesas_en_m3(1)[0]

    respuesta = cliente.post(RUTA, json=CUERPO | {"mesa_id": mesa.id})

    assert respuesta.status_code == 201
    assert respuesta.json()["mesa_id"] == mesa.id
    assert _cantidad_reservas(db) == 1


def test_puente_real_mesa_inexistente_devuelve_404(
    cliente: TestClient, db: Session, puente_real, mesas_en_m3
) -> None:
    mesas_en_m3(1)

    respuesta = cliente.post(RUTA, json=CUERPO | {"mesa_id": 999})

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detalle": "La mesa 999 no existe"}
    assert _cantidad_reservas(db) == 0


# CA 3, CA 7 y formatos: el detalle nombra el campo y no se crea nada
@pytest.mark.parametrize(
    "cuerpo, campo",
    [
        ({k: v for k, v in CUERPO.items() if k != "mesa_id"}, "mesa_id"),
        ({k: v for k, v in CUERPO.items() if k != "cliente_id"}, "cliente_id"),
        ({k: v for k, v in CUERPO.items() if k != "fecha"}, "fecha"),
        ({k: v for k, v in CUERPO.items() if k != "hora"}, "hora"),
        ({k: v for k, v in CUERPO.items() if k != "cantidad_personas"}, "cantidad_personas"),
        (CUERPO | {"cantidad_personas": 0}, "cantidad_personas"),
        (CUERPO | {"mesa_id": 0}, "mesa_id"),
        (CUERPO | {"fecha": "02/11/2026"}, "fecha"),
        (CUERPO | {"hora": "25:00"}, "hora"),
        (CUERPO | {"hora": "21:30:45"}, "hora"),
    ],
    ids=[
        "sin-mesa",
        "sin-cliente",
        "sin-fecha",
        "sin-hora",
        "sin-cantidad",
        "cantidad-cero",
        "mesa-cero",
        "fecha-mal-formada",
        "hora-mal-formada",
        "hora-con-segundos",
    ],
)
def test_post_reservas_datos_invalidos_devuelve_422(
    cliente: TestClient, db: Session, cuerpo: dict, campo: str
) -> None:
    respuesta = cliente.post(RUTA, json=cuerpo)

    assert respuesta.status_code == 422
    assert campo in respuesta.json()["detalle"]
    assert _cantidad_reservas(db) == 0


# CA 2
def test_post_reservas_con_estado_en_el_cuerpo_devuelve_422(
    cliente: TestClient, db: Session
) -> None:
    respuesta = cliente.post(RUTA, json=CUERPO | {"estado": "ATENDIDA"})

    assert respuesta.status_code == 422
    assert "estado" in respuesta.json()["detalle"]
    assert _cantidad_reservas(db) == 0


# CA 7, S5 (issue #61): solo se exige un entero mayor a cero, sin compararlo con la mesa
def test_post_reservas_cantidad_muy_grande_devuelve_201(cliente: TestClient, db: Session) -> None:
    respuesta = cliente.post(RUTA, json=CUERPO | {"cantidad_personas": 100})

    assert respuesta.status_code == 201
    assert respuesta.json()["cantidad_personas"] == 100
    assert db.get(Reserva, respuesta.json()["id"]).cantidad_personas == 100


# D-25 y D-26
def test_post_reservas_errores_tienen_solo_la_clave_detalle(
    cliente: TestClient, fabrica_reserva
) -> None:
    fabrica_reserva(mesa_id=5, fecha=date(2026, 11, 2), hora=time(21, 30))

    conflicto = cliente.post(RUTA, json=CUERPO)
    invalida = cliente.post(RUTA, json=CUERPO | {"cantidad_personas": 0})

    assert conflicto.status_code == 409
    assert invalida.status_code == 422
    for respuesta in (conflicto, invalida):
        cuerpo = respuesta.json()
        assert list(cuerpo) == ["detalle"]
        assert isinstance(cuerpo["detalle"], str)
        assert cuerpo["detalle"]


def test_post_reservas_error_404_tiene_solo_la_clave_detalle(
    cliente: TestClient, puente_sin_mesa
) -> None:
    respuesta = cliente.post(RUTA, json=CUERPO)

    assert respuesta.status_code == 404
    assert list(respuesta.json()) == ["detalle"]
    assert respuesta.json()["detalle"] == "La mesa 5 no existe"


# HU-M5-03: listado paginado
def _ids(respuesta) -> list[int]:
    return [reserva["id"] for reserva in respuesta.json()["items"]]


# CA 1 y CA 2
def test_get_reservas_pagina_y_filtra(cliente: TestClient, fabrica_reserva) -> None:
    hoy, manana = date(2026, 11, 2), date(2026, 11, 3)
    for mesa_id in (1, 2, 3):
        fabrica_reserva(mesa_id=mesa_id, fecha=hoy)
    fabrica_reserva(mesa_id=4, fecha=hoy, estado=EstadoReserva.ATENDIDA)
    fabrica_reserva(mesa_id=5, fecha=manana)
    filtros = "fecha=2026-11-02&estado=ACTIVA&limit=2"

    primera = cliente.get(f"{RUTA}?{filtros}&offset=0")
    segunda = cliente.get(f"{RUTA}?{filtros}&offset=2")

    assert primera.status_code == segunda.status_code == 200
    assert (_ids(primera), primera.json()["total"]) == ([1, 2], 3)
    assert (_ids(segunda), segunda.json()["total"]) == ([3], 3)
    assert (segunda.json()["limit"], segunda.json()["offset"]) == (2, 2)


def test_get_reservas_valores_por_defecto(cliente: TestClient, fabrica_reserva) -> None:
    for mesa_id in range(1, 61):
        fabrica_reserva(mesa_id=mesa_id)

    cuerpo = cliente.get(RUTA).json()

    assert (cuerpo["limit"], cuerpo["offset"], cuerpo["total"]) == (50, 0, 60)
    assert len(cuerpo["items"]) == 50


@pytest.mark.parametrize(
    ("consulta", "campo"),
    [
        ("limit=101", "limit"),
        ("limit=0", "limit"),
        ("offset=-1", "offset"),
        ("offset=abc", "offset"),
    ],
)
def test_get_reservas_limit_fuera_de_rango_devuelve_422(
    cliente: TestClient, consulta: str, campo: str
) -> None:
    respuesta = cliente.get(f"{RUTA}?{consulta}")

    assert respuesta.status_code == 422
    assert list(respuesta.json()) == ["detalle"]
    assert campo in respuesta.json()["detalle"]


@pytest.mark.parametrize(
    ("consulta", "campo"),
    [
        ("estado=ABIERTA", "estado"),
        ("estado=activa", "estado"),
        ("fecha=02/11/2026", "fecha"),
        ("fecha=2026-13-40", "fecha"),
    ],
)
def test_get_reservas_estado_o_fecha_invalidos_devuelve_422(
    cliente: TestClient, consulta: str, campo: str
) -> None:
    respuesta = cliente.get(f"{RUTA}?{consulta}")

    assert respuesta.status_code == 422
    assert list(respuesta.json()) == ["detalle"]
    assert campo in respuesta.json()["detalle"]


# CA 4
def test_get_reservas_sin_resultados_devuelve_200_vacio(cliente: TestClient) -> None:
    respuesta = cliente.get(RUTA)

    assert respuesta.status_code == 200
    assert respuesta.json() == {"items": [], "total": 0, "limit": 50, "offset": 0}


# CA 2: el filtro por fecha acepta cualquier dia, tambien pasado (S22)
def test_get_reservas_filtra_por_fecha_pasada(cliente: TestClient, fabrica_reserva) -> None:
    fabrica_reserva(mesa_id=1, fecha=date(2026, 10, 20), estado=EstadoReserva.ATENDIDA)
    fabrica_reserva(mesa_id=2, fecha=date(2026, 11, 2))

    respuesta = cliente.get(f"{RUTA}?fecha=2026-10-20")

    assert respuesta.status_code == 200
    assert (_ids(respuesta), respuesta.json()["total"]) == ([1], 1)
    assert respuesta.json()["items"][0]["estado"] == "ATENDIDA"


# Decision 7
def test_get_reservas_serializa_hora_en_minutos(cliente: TestClient, fabrica_reserva) -> None:
    fabrica_reserva(hora=time(4, 5))

    respuesta = cliente.get(RUTA)

    assert [reserva["hora"] for reserva in respuesta.json()["items"]] == ["04:05"]


# HU-M5-02: consulta y modificacion
CUERPO_PUT = {"fecha": "2026-11-03", "hora": "22:00", "cantidad_personas": 5}
HOY = date(2026, 11, 2)


def _ocupar_turno(fabrica_reserva, **cambios) -> Reserva:
    """Deja una reserva ACTIVA en la mesa 5 del cliente 7, el 2026-11-02 a las 21:30."""
    turno = {"mesa_id": 5, "cliente_id": 7, "fecha": HOY, "hora": time(21, 30)}
    return fabrica_reserva(**(turno | cambios))


# Escenario "Alta valida", segundo paso: lo creado se consulta con los mismos datos
def test_get_reserva_por_id_devuelve_200(cliente: TestClient) -> None:
    creada = cliente.post(RUTA, json=CUERPO).json()

    respuesta = cliente.get(f"{RUTA}/{creada['id']}")

    assert respuesta.status_code == 200
    assert respuesta.json() == creada
    assert respuesta.json()["estado"] == "ACTIVA"


def test_get_reserva_no_activa_devuelve_200(cliente: TestClient, fabrica_reserva) -> None:
    reserva = _ocupar_turno(fabrica_reserva, estado=EstadoReserva.ATENDIDA)

    respuesta = cliente.get(f"{RUTA}/{reserva.id}")

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "ATENDIDA"


def test_get_reserva_inexistente_devuelve_404(cliente: TestClient) -> None:
    respuesta = cliente.get(f"{RUTA}/999")

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detalle": "La reserva 999 no existe"}


def test_get_reserva_con_id_no_numerico_devuelve_422(cliente: TestClient) -> None:
    respuesta = cliente.get(f"{RUTA}/abc")

    assert respuesta.status_code == 422
    assert list(respuesta.json()) == ["detalle"]


# CA 1: los valores nuevos se ven en la consulta por id y en el listado
def test_put_reserva_modifica_y_devuelve_200(cliente: TestClient, fabrica_reserva) -> None:
    reserva = _ocupar_turno(fabrica_reserva)
    esperada = {
        "id": reserva.id,
        "mesa_id": 5,
        "cliente_id": 7,
        "fecha": "2026-11-03",
        "hora": "22:00",
        "cantidad_personas": 5,
        "estado": "ACTIVA",
    }

    respuesta = cliente.put(f"{RUTA}/{reserva.id}", json=CUERPO_PUT)

    assert respuesta.status_code == 200
    assert respuesta.json() == esperada
    assert cliente.get(f"{RUTA}/{reserva.id}").json() == esperada
    assert cliente.get(RUTA).json()["items"] == [esperada]


# CA 3, S5 (issue #61): la modificacion tampoco compara la cantidad con la capacidad de la mesa
def test_put_reserva_cantidad_muy_grande_devuelve_200(cliente: TestClient, fabrica_reserva) -> None:
    reserva = _ocupar_turno(fabrica_reserva)

    respuesta = cliente.put(f"{RUTA}/{reserva.id}", json=CUERPO_PUT | {"cantidad_personas": 100})

    assert respuesta.status_code == 200
    assert respuesta.json()["cantidad_personas"] == 100
    assert cliente.get(f"{RUTA}/{reserva.id}").json()["cantidad_personas"] == 100


# CA 1 (S19) y CA 2 (S15): cada rechazo deja la reserva como estaba
@pytest.mark.parametrize(
    ("cuerpo", "campo"),
    [
        ({k: v for k, v in CUERPO_PUT.items() if k != "hora"}, "hora"),
        (CUERPO_PUT | {"mesa_id": 6}, "mesa_id"),
        (CUERPO_PUT | {"cliente_id": 8}, "cliente_id"),
        (CUERPO_PUT | {"estado": "ATENDIDA"}, "estado"),
    ],
    ids=["sin-hora", "con-mesa", "con-cliente", "con-estado"],
)
def test_put_reserva_con_cuerpo_invalido_devuelve_422(
    cliente: TestClient, db: Session, fabrica_reserva, cuerpo: dict, campo: str
) -> None:
    reserva = _ocupar_turno(fabrica_reserva)

    respuesta = cliente.put(f"{RUTA}/{reserva.id}", json=cuerpo)

    assert respuesta.status_code == 422
    assert campo in respuesta.json()["detalle"]
    db.expire_all()
    assert (reserva.mesa_id, reserva.cliente_id, reserva.estado) == (5, 7, EstadoReserva.ACTIVA)
    assert (reserva.fecha, reserva.hora, reserva.cantidad_personas) == (HOY, time(21, 30), 4)


# CA 5
def test_put_reserva_no_activa_devuelve_409(cliente: TestClient, fabrica_reserva) -> None:
    reserva = _ocupar_turno(fabrica_reserva, estado=EstadoReserva.ATENDIDA)

    respuesta = cliente.put(f"{RUTA}/{reserva.id}", json=CUERPO_PUT)

    assert respuesta.status_code == 409
    assert respuesta.json() == {
        "detalle": f"La reserva {reserva.id} no está activa y no se puede modificar"
    }


# CA 4
def test_put_reserva_turno_ocupado_devuelve_409(cliente: TestClient, fabrica_reserva) -> None:
    _ocupar_turno(fabrica_reserva)
    otra = _ocupar_turno(fabrica_reserva, hora=time(22, 0))

    respuesta = cliente.put(
        f"{RUTA}/{otra.id}", json=CUERPO_PUT | {"fecha": "2026-11-02", "hora": "21:30"}
    )

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": TURNO_OCUPADO}


# CA 3
def test_put_reserva_fecha_pasada_devuelve_422(cliente: TestClient, fabrica_reserva) -> None:
    reserva = _ocupar_turno(fabrica_reserva)

    respuesta = cliente.put(f"{RUTA}/{reserva.id}", json=CUERPO_PUT | {"fecha": "2026-11-01"})

    assert respuesta.status_code == 422
    assert respuesta.json() == {"detalle": "La fecha de la reserva no puede ser anterior a hoy"}


# CA 6
def test_put_reserva_inexistente_devuelve_404(cliente: TestClient, db: Session) -> None:
    respuesta = cliente.put(f"{RUTA}/999", json=CUERPO_PUT)

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detalle": "La reserva 999 no existe"}
    assert _cantidad_reservas(db) == 0


def test_put_reserva_con_id_no_numerico_devuelve_422(cliente: TestClient) -> None:
    respuesta = cliente.put(f"{RUTA}/abc", json=CUERPO_PUT)

    assert respuesta.status_code == 422
    assert list(respuesta.json()) == ["detalle"]


# D-25 y D-26
def test_put_reserva_errores_tienen_solo_la_clave_detalle(
    cliente: TestClient, fabrica_reserva
) -> None:
    reserva = _ocupar_turno(fabrica_reserva)
    atendida = _ocupar_turno(fabrica_reserva, mesa_id=6, estado=EstadoReserva.ATENDIDA)

    respuestas = [
        cliente.put(f"{RUTA}/999", json=CUERPO_PUT),
        cliente.put(f"{RUTA}/{atendida.id}", json=CUERPO_PUT),
        cliente.put(f"{RUTA}/{reserva.id}", json=CUERPO_PUT | {"cantidad_personas": 0}),
    ]

    assert [respuesta.status_code for respuesta in respuestas] == [404, 409, 422]
    for respuesta in respuestas:
        cuerpo = respuesta.json()
        assert list(cuerpo) == ["detalle"]
        assert isinstance(cuerpo["detalle"], str)
        assert cuerpo["detalle"]


# --- Issue #61: GET /reservas/mesas-disponibles ---

RUTA_MESAS = f"{RUTA}/mesas-disponibles"
TURNO = {"fecha": "2026-11-02", "hora": "21:30"}
MESA_5 = {"id": 5, "numero": 5, "capacidad": 4, "sector": {"id": 1, "nombre": "Salón"}}


def _ids_de_mesas(respuesta) -> list[int]:
    return [mesa["id"] for mesa in respuesta.json()]


# Escenario "Una mesa libre figura en la lista": lista simple, sin paginar y sin estado (S29)
def test_get_mesas_disponibles_devuelve_200_con_la_lista(cliente: TestClient) -> None:
    respuesta = cliente.get(RUTA_MESAS, params=TURNO)

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert isinstance(cuerpo, list)
    assert _ids_de_mesas(respuesta) == [5, 6]
    assert cuerpo[0] == MESA_5
    assert set(cuerpo[0]) == {"id", "numero", "capacidad", "sector"}
    assert set(cuerpo[0]["sector"]) == {"id", "nombre"}


# Escenario "La ruta no se confunde con la consulta por id": el orden de las rutas importa
def test_get_mesas_disponibles_no_se_confunde_con_la_consulta_por_id(
    cliente: TestClient,
) -> None:
    creada = cliente.post(RUTA, json=CUERPO).json()

    mesas = cliente.get(RUTA_MESAS, params=TURNO)
    no_numerico = cliente.get(f"{RUTA}/abc")
    por_id = cliente.get(f"{RUTA}/{creada['id']}")

    assert mesas.status_code == 200
    assert _ids_de_mesas(mesas) == [6]
    assert no_numerico.status_code == 422
    assert por_id.status_code == 200
    assert por_id.json() == creada


@pytest.mark.parametrize(
    ("campo", "params"),
    [("fecha", {"hora": "21:30"}), ("hora", {"fecha": "2026-11-02"})],
    ids=["sin-fecha", "sin-hora"],
)
def test_get_mesas_disponibles_sin_fecha_o_sin_hora_devuelve_422_nombrando_el_campo(
    cliente: TestClient, campo: str, params: dict
) -> None:
    respuesta = cliente.get(RUTA_MESAS, params=params)

    assert respuesta.status_code == 422
    assert list(respuesta.json()) == ["detalle"]
    assert f"{campo}: " in respuesta.json()["detalle"]


@pytest.mark.parametrize(
    ("campo", "valor"),
    [
        ("fecha", "02/11/2026"),
        ("fecha", "2026-13-40"),
        ("hora", "25:00"),
        ("hora", "9pm"),
        ("hora", "21:30:45"),
    ],
)
def test_get_mesas_disponibles_formato_invalido_devuelve_422_nombrando_el_campo(
    cliente: TestClient, campo: str, valor: str
) -> None:
    respuesta = cliente.get(RUTA_MESAS, params=TURNO | {campo: valor})

    assert respuesta.status_code == 422
    assert list(respuesta.json()) == ["detalle"]
    assert f"{campo}: " in respuesta.json()["detalle"]


# S32: las mismas reglas de "no pasado" del alta, con los mismos mensajes
@pytest.mark.parametrize(
    ("turno", "mensaje"),
    [
        (
            {"fecha": "2026-11-01", "hora": "21:30"},
            "La fecha de la reserva no puede ser anterior a hoy",
        ),
        (
            {"fecha": "2026-11-02", "hora": "12:00"},
            "La hora de la reserva debe ser posterior a la hora actual",
        ),
        (
            {"fecha": "2026-11-02", "hora": "11:00"},
            "La hora de la reserva debe ser posterior a la hora actual",
        ),
    ],
    ids=["fecha-anterior-a-hoy", "hoy-a-la-hora-actual", "hoy-a-una-hora-anterior"],
)
def test_get_mesas_disponibles_turno_pasado_devuelve_422(
    cliente: TestClient, turno: dict, mensaje: str
) -> None:
    respuesta = cliente.get(RUTA_MESAS, params=turno)

    assert respuesta.status_code == 422
    assert respuesta.json() == {"detalle": mensaje}


# Que no haya mesas para reservar no es un error
def test_get_mesas_disponibles_sin_mesas_devuelve_200_con_lista_vacia(
    cliente: TestClient, puente_sin_mesa
) -> None:
    respuesta = cliente.get(RUTA_MESAS, params=TURNO)

    assert respuesta.status_code == 200
    assert respuesta.json() == []


# S33: con el puente real, la lista sale de todas las paginas de M3
def test_puente_real_mesas_disponibles_y_alta_con_120_mesas(
    cliente: TestClient, db: Session, puente_real, mesas_en_m3
) -> None:
    ultima = mesas_en_m3(120)[-1]

    lista = cliente.get(RUTA_MESAS, params=TURNO)
    alta = cliente.post(RUTA, json=CUERPO | {"mesa_id": ultima.id})
    lista_despues = cliente.get(RUTA_MESAS, params=TURNO)

    assert lista.status_code == 200
    assert len(lista.json()) == 120
    assert lista.json()[-1]["id"] == ultima.id
    assert alta.status_code == 201
    assert alta.json()["mesa_id"] == ultima.id
    assert len(lista_despues.json()) == 119  # reservar la mesa la saca de la lista (S35)
    assert _cantidad_reservas(db) == 1


# Issue #61: la mesa fuera de servicio no figura y el alta sobre ella responde 409
def test_puente_real_fuera_de_servicio_no_figura_y_el_alta_responde_409(
    cliente: TestClient, db: Session, puente_real, mesas_en_m3
) -> None:
    fuera, libre = mesas_en_m3(2)
    fuera.estado = EstadoMesa.FUERA_DE_SERVICIO
    db.commit()

    lista = cliente.get(RUTA_MESAS, params=TURNO)
    alta = cliente.post(RUTA, json=CUERPO | {"mesa_id": fuera.id})

    assert lista.status_code == 200
    assert _ids_de_mesas(lista) == [libre.id]
    assert alta.status_code == 409
    assert alta.json() == {"detalle": f"La mesa {fuera.id} está fuera de servicio"}
    assert _cantidad_reservas(db) == 0


# S33: si M3 falla en una pagina, falla todo: sin lista parcial y sin reserva guardada
def test_puente_real_falla_de_m3_en_la_segunda_pagina_devuelve_500_sin_guardar(
    cliente: TestClient, db: Session, puente_real, mesas_en_m3, m3_falla_desde_la_segunda_pagina
) -> None:
    mesas_en_m3(120)
    # `cliente` ya instalo la sesion de prueba en dependency_overrides; este cliente la reutiliza
    # y devuelve la respuesta 500 en lugar de relanzar la excepcion en la prueba.
    sin_relanzar = TestClient(app, raise_server_exceptions=False)

    lista = sin_relanzar.get(RUTA_MESAS, params=TURNO)
    alta = sin_relanzar.post(RUTA, json=CUERPO | {"mesa_id": 5})

    for respuesta in (lista, alta):
        assert respuesta.status_code == 500
        assert not respuesta.text.lstrip().startswith("[")
    assert _cantidad_reservas(db) == 0


# --- S28: "hoy" y la hora actual en la zona del restaurante (UTC-3) ---
# Reloj UTC del servidor: 2026-11-02 02:30 (en el restaurante, 2026-11-01 23:30), con el proceso en
# UTC como en Docker. `reloj_utc_fijo` deja el `ahora()` verdadero; las pruebas lo piden.

ANOCHE = {"fecha": "2026-11-01"}


# Escenario "El servidor ya esta en el dia siguiente en UTC"
def test_post_reservas_acepta_hoy_del_restaurante_aunque_el_servidor_ya_este_en_manana(
    cliente: TestClient, reloj_utc_fijo
) -> None:
    respuesta = cliente.post(RUTA, json=CUERPO | ANOCHE | {"hora": "23:45"})

    assert respuesta.status_code == 201
    assert respuesta.json()["fecha"] == "2026-11-01"
    assert respuesta.json()["hora"] == "23:45"


# Escenario "La hora ya paso en la zona del restaurante"
def test_post_reservas_hora_pasada_en_la_zona_del_restaurante_devuelve_422(
    cliente: TestClient, db: Session, reloj_utc_fijo
) -> None:
    respuesta = cliente.post(RUTA, json=CUERPO | ANOCHE | {"hora": "23:00"})

    assert respuesta.status_code == 422
    assert respuesta.json() == {
        "detalle": "La hora de la reserva debe ser posterior a la hora actual"
    }
    assert _cantidad_reservas(db) == 0


# Escenario "Ayer en la zona del restaurante"
def test_post_reservas_ayer_en_la_zona_del_restaurante_devuelve_422(
    cliente: TestClient, db: Session, reloj_utc_fijo
) -> None:
    respuesta = cliente.post(RUTA, json=CUERPO | {"fecha": "2026-10-31"})

    assert respuesta.status_code == 422
    assert respuesta.json() == {"detalle": "La fecha de la reserva no puede ser anterior a hoy"}
    assert _cantidad_reservas(db) == 0


# Escenario "La consulta de mesas disponibles usa el mismo hoy"
def test_get_mesas_disponibles_usa_el_hoy_de_la_zona_del_restaurante(
    cliente: TestClient, reloj_utc_fijo
) -> None:
    respuesta = cliente.get(RUTA_MESAS, params=ANOCHE | {"hora": "23:45"})

    assert respuesta.status_code == 200
    assert _ids_de_mesas(respuesta) == [5, 6]
