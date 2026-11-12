"""Pruebas del router de reservas: alta (HU-M5-01), consulta y modificacion (HU-M5-02), listado."""

from datetime import date, time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.main import app
from app.modules.atencion.models import Cliente
from app.modules.atencion.service import ComandaAbiertaError
from app.modules.reservas import repository
from app.modules.reservas.models import EstadoReserva, Reserva

# El modelo de salon se importa solo en las pruebas (lint-imports controla `app`, no `tests`).
from app.modules.salon.models import Mesa
from app.shared.excepciones import NoEncontradoError, ReglaDeNegocioError
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
CLIENTE_NUEVO = {"nombre": "Luis Gómez", "telefono": "+54 280 1234567"}
SIN_CLIENTE = {k: v for k, v in CUERPO.items() if k != "cliente_id"}
# S69: una reserva ACTIVA o ATENDIDA ocupa la mesa 2 horas desde su hora; el mensaje nombra la
# reserva que conflicta, no el turno pedido.
TURNO_OCUPADO = (
    "La mesa 5 ya tiene una reserva el 2026-11-02 a las 21:30; cada reserva ocupa la mesa 2 horas"
)


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
    cliente: TestClient, db: Session, fabrica_reserva, puente_doble
) -> None:
    puente_doble.poner_cliente(8, "Beto Díaz", "+54 280 7654321")
    fabrica_reserva(mesa_id=5, fecha=date(2026, 11, 2), hora=time(21, 30))

    respuesta = cliente.post(RUTA, json=CUERPO | {"cliente_id": 8})

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": TURNO_OCUPADO}
    assert _cantidad_reservas(db) == 1


# S69: dentro de las 2 horas de otra reserva de la mesa tambien es 409, con la hora de la otra
@pytest.mark.parametrize(
    "hora", ["19:31", "21:31", "23:29"], ids=["119-antes", "1-despues", "119-despues"]
)
def test_post_reservas_turno_dentro_de_la_ventana_devuelve_409_con_detalle(
    cliente: TestClient, db: Session, fabrica_reserva, hora: str
) -> None:
    fabrica_reserva(mesa_id=5, fecha=date(2026, 11, 2), hora=time(21, 30))

    respuesta = cliente.post(RUTA, json=CUERPO | {"hora": hora})

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": TURNO_OCUPADO}
    assert _cantidad_reservas(db) == 1


# S69: la ventana es estricta: justo a 2 horas de la otra reserva, antes o despues, se acepta
@pytest.mark.parametrize("hora", ["19:30", "23:30"], ids=["120-antes", "120-despues"])
def test_post_reservas_turno_justo_a_dos_horas_devuelve_201(
    cliente: TestClient, db: Session, fabrica_reserva, hora: str
) -> None:
    fabrica_reserva(mesa_id=5, fecha=date(2026, 11, 2), hora=time(21, 30))

    respuesta = cliente.post(RUTA, json=CUERPO | {"hora": hora})

    assert respuesta.status_code == 201
    assert respuesta.json()["hora"] == hora
    assert _cantidad_reservas(db) == 2


# S69: la ventana cruza la medianoche y una reserva ATENDIDA tambien ocupa la mesa
def test_post_reservas_turno_del_dia_siguiente_dentro_de_la_ventana_devuelve_409(
    cliente: TestClient, db: Session, fabrica_reserva
) -> None:
    fabrica_reserva(
        mesa_id=5, fecha=date(2026, 11, 2), hora=time(23, 30), estado=EstadoReserva.ATENDIDA
    )

    respuesta = cliente.post(RUTA, json=CUERPO | {"fecha": "2026-11-03", "hora": "00:30"})

    assert respuesta.status_code == 409
    assert respuesta.json() == {
        "detalle": "La mesa 5 ya tiene una reserva el 2026-11-02 a las 23:30; "
        "cada reserva ocupa la mesa 2 horas"
    }
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
    cliente: TestClient, db: Session, puente_real, mesas_en_m3, cliente_en_m4: int
) -> None:
    mesa = mesas_en_m3(1)[0]

    respuesta = cliente.post(RUTA, json=CUERPO | {"mesa_id": mesa.id, "cliente_id": cliente_en_m4})

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
    otra = _ocupar_turno(fabrica_reserva, hora=time(23, 30))

    respuesta = cliente.put(
        f"{RUTA}/{otra.id}", json=CUERPO_PUT | {"fecha": "2026-11-02", "hora": "21:30"}
    )

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": TURNO_OCUPADO}


# S69: mover la reserva a un turno que cae dentro de las 2 horas de otra tambien es 409
def test_put_reserva_turno_dentro_de_la_ventana_devuelve_409(
    cliente: TestClient, fabrica_reserva
) -> None:
    _ocupar_turno(fabrica_reserva)
    otra = _ocupar_turno(fabrica_reserva, fecha=date(2026, 11, 3))

    respuesta = cliente.put(
        f"{RUTA}/{otra.id}", json=CUERPO_PUT | {"fecha": "2026-11-02", "hora": "22:30"}
    )

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": TURNO_OCUPADO}
    assert cliente.get(f"{RUTA}/{otra.id}").json()["fecha"] == "2026-11-03"


# S69: justo a 2 horas de otra reserva se acepta; la propia reserva no cuenta contra si misma
def test_put_reserva_justo_a_dos_horas_y_dentro_de_su_propia_ventana_devuelve_200(
    cliente: TestClient, fabrica_reserva
) -> None:
    _ocupar_turno(fabrica_reserva)
    otra = _ocupar_turno(fabrica_reserva, fecha=date(2026, 11, 3))
    propia = _ocupar_turno(fabrica_reserva, mesa_id=6)

    a_dos_horas = cliente.put(
        f"{RUTA}/{otra.id}", json=CUERPO_PUT | {"fecha": "2026-11-02", "hora": "23:30"}
    )
    dentro_de_su_ventana = cliente.put(
        f"{RUTA}/{propia.id}", json=CUERPO_PUT | {"fecha": "2026-11-02", "hora": "22:30"}
    )

    assert a_dos_horas.status_code == 200
    assert a_dos_horas.json()["hora"] == "23:30"
    assert dentro_de_su_ventana.status_code == 200
    assert dentro_de_su_ventana.json()["hora"] == "22:30"


# S69: la ventana solo se revisa si cambian fecha u hora; la superposicion de antes no bloquea
def test_put_reserva_sin_cambiar_fecha_ni_hora_con_superposicion_previa_devuelve_200(
    cliente: TestClient, fabrica_reserva
) -> None:
    _ocupar_turno(fabrica_reserva)
    otra = _ocupar_turno(fabrica_reserva, hora=time(22, 0))  # ya se superpone con la primera

    respuesta = cliente.put(
        f"{RUTA}/{otra.id}",
        json=CUERPO_PUT | {"fecha": "2026-11-02", "hora": "22:00", "cantidad_personas": 6},
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["cantidad_personas"] == 6


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


# S69: la lista usa la misma ventana de 2 horas que el alta: no ofrece una mesa que el alta rechaza
@pytest.mark.parametrize("estado", [EstadoReserva.ACTIVA, EstadoReserva.ATENDIDA])
def test_get_mesas_disponibles_excluye_la_mesa_con_reserva_dentro_de_la_ventana(
    cliente: TestClient, fabrica_reserva, estado: EstadoReserva
) -> None:
    fabrica_reserva(mesa_id=5, fecha=date(2026, 11, 2), hora=time(22, 30), estado=estado)

    lista = cliente.get(RUTA_MESAS, params=TURNO)
    alta = cliente.post(RUTA, json=CUERPO)

    assert _ids_de_mesas(lista) == [6]
    assert alta.status_code == 409


def test_get_mesas_disponibles_incluye_la_mesa_con_reserva_justo_a_dos_horas(
    cliente: TestClient, fabrica_reserva
) -> None:
    fabrica_reserva(mesa_id=5, fecha=date(2026, 11, 2), hora=time(23, 30))

    lista = cliente.get(RUTA_MESAS, params=TURNO)
    alta = cliente.post(RUTA, json=CUERPO)

    assert _ids_de_mesas(lista) == [5, 6]
    assert alta.status_code == 201


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
    cliente: TestClient, db: Session, puente_real, mesas_en_m3, cliente_en_m4: int
) -> None:
    ultima = mesas_en_m3(120)[-1]

    lista = cliente.get(RUTA_MESAS, params=TURNO)
    alta = cliente.post(RUTA, json=CUERPO | {"mesa_id": ultima.id, "cliente_id": cliente_en_m4})
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


# --- Cliente registrado o nuevo (issue #61, S39 a S43) ---


def _clientes_en_m4(db: Session) -> list[Cliente]:
    return list(db.scalars(select(Cliente).order_by(Cliente.id)))


def test_post_reservas_con_cliente_nuevo_devuelve_201(
    cliente: TestClient, db: Session, puente_doble
) -> None:
    respuesta = cliente.post(RUTA, json=SIN_CLIENTE | {"cliente_nuevo": CLIENTE_NUEVO})

    assert respuesta.status_code == 201
    cliente_id = respuesta.json()["cliente_id"]
    assert cliente_id >= 100
    assert puente_doble.registrados == [(cliente_id, "Luis Gómez", "+54 280 1234567")]
    assert cliente.get(f"{RUTA}/{respuesta.json()['id']}").json()["cliente_id"] == cliente_id


def test_post_reservas_con_cliente_existente_no_registra_clientes(
    cliente: TestClient, puente_doble
) -> None:
    respuesta = cliente.post(RUTA, json=CUERPO)

    assert respuesta.status_code == 201
    assert respuesta.json()["cliente_id"] == 7
    assert puente_doble.registrados == []


@pytest.mark.parametrize(
    "cuerpo",
    [
        CUERPO | {"cliente_nuevo": CLIENTE_NUEVO},
        SIN_CLIENTE,
        SIN_CLIENTE | {"cliente_nuevo": None},
    ],
    ids=["los-dos", "ninguno", "cliente-nuevo-null"],
)
def test_post_reservas_sin_exactamente_un_cliente_devuelve_422(
    cliente: TestClient, db: Session, puente_doble, cuerpo: dict
) -> None:
    respuesta = cliente.post(RUTA, json=cuerpo)

    assert respuesta.status_code == 422
    detalle = respuesta.json()["detalle"]
    assert "cliente_id" in detalle
    assert "cliente_nuevo" in detalle
    assert not detalle.startswith("Datos invalidos. :")
    assert _cantidad_reservas(db) == 0
    assert puente_doble.registrados == []


@pytest.mark.parametrize(
    "cliente_nuevo, campo",
    [
        (CLIENTE_NUEVO | {"dni": "1"}, "dni"),
        ({"nombre": 123, "telefono": "123"}, "nombre"),
        ({"nombre": "Luis"}, "telefono"),
    ],
)
def test_post_reservas_cliente_nuevo_con_forma_invalida_devuelve_422(
    cliente: TestClient, db: Session, cliente_nuevo: dict, campo: str
) -> None:
    respuesta = cliente.post(RUTA, json=SIN_CLIENTE | {"cliente_nuevo": cliente_nuevo})

    assert respuesta.status_code == 422
    assert campo in respuesta.json()["detalle"]
    assert _cantidad_reservas(db) == 0


def test_post_reservas_cliente_nuevo_valida_el_contenido_con_m4(
    cliente: TestClient, db: Session, puente_doble
) -> None:
    invalido = cliente.post(
        RUTA, json=SIN_CLIENTE | {"cliente_nuevo": CLIENTE_NUEVO | {"nombre": "Luis3"}}
    )
    valido = cliente.post(
        RUTA, json=SIN_CLIENTE | {"cliente_nuevo": CLIENTE_NUEVO | {"nombre": "María José"}}
    )

    assert invalido.status_code == 422
    assert "nombre" in invalido.json()["detalle"]
    assert valido.status_code == 201
    assert _cantidad_reservas(db) == 1


# S41, integracion con el puente real: el cliente nuevo queda en M4 y no hay huerfanos
def test_puente_real_alta_con_cliente_nuevo_lo_registra_en_m4(
    cliente: TestClient, db: Session, puente_real, mesas_en_m3
) -> None:
    mesa = mesas_en_m3(1)[0]

    respuesta = cliente.post(
        RUTA, json=SIN_CLIENTE | {"mesa_id": mesa.id, "cliente_nuevo": CLIENTE_NUEVO}
    )

    assert respuesta.status_code == 201
    buscados = cliente.get("/api/v1/clientes", params={"q": "Luis"}).json()["items"]
    assert [c["id"] for c in buscados] == [respuesta.json()["cliente_id"]]
    assert [c["nombre"] for c in buscados] == ["Luis Gómez"]


@pytest.mark.parametrize(
    "cambios, estado",
    [({"mesa_id": 999}, 404), ({}, 409), ({"fecha": "2026-11-01"}, 422)],
    ids=["mesa-inexistente", "turno-ocupado", "fecha-pasada"],
)
def test_puente_real_reserva_fallida_no_deja_cliente_huerfano(
    cliente: TestClient,
    db: Session,
    puente_real,
    mesas_en_m3,
    cliente_en_m4: int,
    fabrica_reserva,
    cambios: dict,
    estado: int,
) -> None:
    mesa = mesas_en_m3(1)[0]
    fabrica_reserva(mesa_id=mesa.id, fecha=date(2026, 11, 2), hora=time(21, 30))
    antes = [c.id for c in _clientes_en_m4(db)]

    respuesta = cliente.post(
        RUTA,
        json=SIN_CLIENTE | {"mesa_id": mesa.id, "cliente_nuevo": CLIENTE_NUEVO} | cambios,
    )

    assert respuesta.status_code == estado
    assert [c.id for c in _clientes_en_m4(db)] == antes == [cliente_en_m4]
    assert len(cliente.get("/api/v1/clientes").json()["items"]) == 1
    assert _cantidad_reservas(db) == 1


# S41: la carrera por el indice unico deshace tambien al cliente nuevo
def test_puente_real_carrera_por_el_indice_unico_no_deja_cliente_nuevo(
    cliente: TestClient,
    db: Session,
    puente_real,
    mesas_en_m3,
    cliente_en_m4: int,
    fabrica_reserva,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    mesa = mesas_en_m3(1)[0]
    fabrica_reserva(mesa_id=mesa.id, fecha=date(2026, 11, 2), hora=time(21, 30))
    monkeypatch.setattr(repository, "reserva_que_ocupa_la_mesa", lambda *_a, **_k: None)

    respuesta = cliente.post(
        RUTA, json=SIN_CLIENTE | {"mesa_id": mesa.id, "cliente_nuevo": CLIENTE_NUEVO}
    )

    assert respuesta.status_code == 409
    assert respuesta.json() == {
        "detalle": f"La mesa {mesa.id} ya tiene una reserva el 2026-11-02 a las 21:30; "
        "cada reserva ocupa la mesa 2 horas"
    }
    assert _cantidad_reservas(db) == 1
    assert [c.id for c in _clientes_en_m4(db)] == [cliente_en_m4]


def test_puente_real_nombre_invalido_devuelve_422_sin_cliente(
    cliente: TestClient, db: Session, puente_real, mesas_en_m3, cliente_en_m4: int
) -> None:
    mesa = mesas_en_m3(1)[0]

    respuesta = cliente.post(
        RUTA,
        json=SIN_CLIENTE
        | {"mesa_id": mesa.id, "cliente_nuevo": CLIENTE_NUEVO | {"nombre": "Luis3"}},
    )

    assert respuesta.status_code == 422
    assert "nombre:" in respuesta.json()["detalle"]
    assert [c.id for c in _clientes_en_m4(db)] == [cliente_en_m4]
    assert _cantidad_reservas(db) == 0


def test_puente_real_cliente_existente_que_m4_no_conoce_devuelve_404(
    cliente: TestClient, db: Session, puente_real, mesas_en_m3, cliente_en_m4: int
) -> None:
    mesa = mesas_en_m3(1)[0]

    respuesta = cliente.post(RUTA, json=CUERPO | {"mesa_id": mesa.id, "cliente_id": 456})

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detalle": "El cliente 456 no existe"}
    assert _cantidad_reservas(db) == 0


# #48 CA 2: un dato obligatorio faltante no crea ni cliente ni reserva (puente real)
@pytest.mark.parametrize("faltante", ["nombre", "telefono"])
def test_puente_real_dato_obligatorio_faltante_no_crea_cliente_ni_reserva(
    cliente: TestClient, db: Session, puente_real, mesas_en_m3, cliente_en_m4: int, faltante: str
) -> None:
    mesa = mesas_en_m3(1)[0]
    cliente_nuevo = {k: v for k, v in CLIENTE_NUEVO.items() if k != faltante}

    respuesta = cliente.post(
        RUTA, json=SIN_CLIENTE | {"mesa_id": mesa.id, "cliente_nuevo": cliente_nuevo}
    )

    assert respuesta.status_code == 422
    assert faltante in respuesta.json()["detalle"]
    assert [c.id for c in _clientes_en_m4(db)] == [cliente_en_m4]
    assert _cantidad_reservas(db) == 0


# --- HU-M5-04 y HU-M5-05: cancelar una reserva anticipadamente o por ausencia ---
# El reloj de las pruebas (conftest.py) marca el 2026-11-02 a las 12:00.


def _cancelar_anticipada(cliente: TestClient, reserva_id: int):
    return cliente.post(f"{RUTA}/{reserva_id}/cancelar-anticipada")


def _cancelar_por_ausencia(cliente: TestClient, reserva_id: int):
    return cliente.post(f"{RUTA}/{reserva_id}/cancelar-por-ausencia")


def test_post_reservas_cancelar_anticipada_devuelve_200_con_el_estado(
    cliente: TestClient, fabrica_reserva
) -> None:
    reserva = fabrica_reserva(mesa_id=5, fecha=date(2026, 11, 2), hora=time(21, 30))

    respuesta = _cancelar_anticipada(cliente, reserva.id)

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "CANCELADA_ANTICIPADA"


def test_post_reservas_cancelar_por_ausencia_devuelve_200_con_el_estado(
    cliente: TestClient, fabrica_reserva
) -> None:
    reserva = fabrica_reserva(mesa_id=6, fecha=date(2026, 11, 2), hora=time(11, 30))

    respuesta = _cancelar_por_ausencia(cliente, reserva.id)

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "CANCELADA_POR_AUSENCIA"


def test_post_reservas_cancelar_anticipada_reserva_inexistente_devuelve_404(
    cliente: TestClient,
) -> None:
    respuesta = _cancelar_anticipada(cliente, 999)

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detalle": "La reserva 999 no existe"}


def test_post_reservas_cancelar_por_ausencia_reserva_inexistente_devuelve_404(
    cliente: TestClient,
) -> None:
    respuesta = _cancelar_por_ausencia(cliente, 999)

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detalle": "La reserva 999 no existe"}


def test_post_reservas_cancelar_anticipada_ya_cancelada_devuelve_409_con_detalle(
    cliente: TestClient, fabrica_reserva
) -> None:
    reserva = fabrica_reserva(fecha=date(2026, 11, 3), estado=EstadoReserva.CANCELADA_ANTICIPADA)

    respuesta = _cancelar_anticipada(cliente, reserva.id)

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": f"La reserva {reserva.id} ya fue cancelada"}
    assert list(respuesta.json()) == ["detalle"]


def test_post_reservas_cancelar_por_ausencia_hora_no_llegada_devuelve_409_con_detalle(
    cliente: TestClient, fabrica_reserva
) -> None:
    reserva = fabrica_reserva(fecha=date(2026, 11, 2), hora=time(12, 1))

    respuesta = _cancelar_por_ausencia(cliente, reserva.id)

    assert respuesta.status_code == 409
    assert respuesta.json() == {
        "detalle": (
            f"La reserva {reserva.id} todavía no llegó a su hora y no se puede cancelar "
            "por ausencia"
        )
    }
    assert list(respuesta.json()) == ["detalle"]


def test_post_reservas_cancelar_anticipada_no_choca_con_get_ni_put_por_id(
    cliente: TestClient, fabrica_reserva
) -> None:
    reserva = fabrica_reserva(fecha=date(2026, 11, 2), hora=time(21, 30))

    cancelada = _cancelar_anticipada(cliente, reserva.id)
    consulta = cliente.get(f"{RUTA}/{reserva.id}")
    modificacion = cliente.put(f"{RUTA}/{reserva.id}", json=CUERPO_PUT)

    assert cancelada.status_code == 200
    assert consulta.status_code == 200
    assert consulta.json()["estado"] == "CANCELADA_ANTICIPADA"
    # PUT /reservas/{id} sigue resolviendo a modificar_reserva, no a una ruta de cancelacion;
    # responde 409 porque la reserva ya no esta ACTIVA (S7), no 404 por una ruta confundida.
    assert modificacion.status_code == 409
    assert modificacion.json() == {
        "detalle": f"La reserva {reserva.id} no está activa y no se puede modificar"
    }


def test_post_reservas_cancelar_anticipada_hu_m5_04_ca1_de_punta_a_punta(
    cliente: TestClient,
) -> None:
    creada = cliente.post(RUTA, json=CUERPO).json()

    cancelada = _cancelar_anticipada(cliente, creada["id"])
    disponibles = cliente.get(RUTA_MESAS, params=TURNO)

    assert cancelada.status_code == 200
    assert cancelada.json()["estado"] == "CANCELADA_ANTICIPADA"
    assert 5 in _ids_de_mesas(disponibles)


def test_puente_real_cancelar_no_cambia_el_estado_de_la_mesa_en_m3(
    cliente: TestClient, db: Session, puente_real, mesas_en_m3, fabrica_reserva
) -> None:
    mesa = mesas_en_m3(1)[0]
    reserva = fabrica_reserva(mesa_id=mesa.id, fecha=date(2026, 11, 2), hora=time(21, 30))

    respuesta = _cancelar_anticipada(cliente, reserva.id)

    assert respuesta.status_code == 200
    db.expire_all()
    assert db.get(Mesa, mesa.id).estado == EstadoMesa.LIBRE


# --- HU-M5-06: POST /reservas/{reserva_id}/comanda ---
# El reloj de las pruebas (conftest.py) marca el 2026-11-02 a las 12:00. Los ids de las reservas son
# los que asigna la base: las pruebas usan `reserva.id`, no un numero fijo. M4 es el doble del
# puente.

PEDIDO = {"detalles": [{"producto_id": 12, "cantidad": 2}]}
MENU_5 = {"menu_ejecutivo_id": 5, "cantidad": 1}
MENU_6 = {"menu_ejecutivo_id": 6, "cantidad": 2}
AL_MENOS_UN_PRODUCTO = "La comanda debe incluir al menos un producto"
UNA_REFERENCIA = "Indique un producto o un menú ejecutivo, exclusivamente"
CLAVES_DE_RESERVA = {"id", "mesa_id", "cliente_id", "fecha", "hora", "cantidad_personas", "estado"}


def _ruta_comanda(reserva_id: object) -> str:
    return f"{RUTA}/{reserva_id}/comanda"


def _atender(cliente: TestClient, reserva_id: object, cuerpo: dict = PEDIDO):
    return cliente.post(_ruta_comanda(reserva_id), json=cuerpo)


def _de_hoy(fabrica_reserva, **cambios) -> Reserva:
    """La reserva de referencia: ACTIVA, de hoy, en la mesa 5, para el cliente 7."""
    cuerpo = {"mesa_id": 5, "cliente_id": 7, "fecha": date(2026, 11, 2), "hora": time(21, 30)}
    return fabrica_reserva(**(cuerpo | cambios))


def _estado_de(db: Session, reserva_id: int) -> EstadoReserva:
    """Relee la reserva de la base (no del identity map) despues de la solicitud."""
    db.expire_all()
    return db.get(Reserva, reserva_id).estado


# CA 1
def test_post_comanda_de_reserva_devuelve_201_con_la_comanda_abierta_y_atiende_la_reserva(
    cliente: TestClient, fabrica_reserva, puente_doble
) -> None:
    reserva = _de_hoy(fabrica_reserva)

    respuesta = _atender(cliente, reserva.id)

    assert respuesta.status_code == 201
    comanda = respuesta.json()
    assert comanda["estado"] == "ABIERTA"
    assert (comanda["mesa_id"], comanda["reserva_id"]) == (5, reserva.id)
    assert [(d["producto_id"], d["cantidad"]) for d in comanda["detalles"]] == [(12, 2)]
    # A M4 se le pidio una sola comanda, con la mesa y el vinculo de la reserva
    assert [(mesa, vinculo) for mesa, vinculo, _, _ in puente_doble.comandas] == [(5, reserva.id)]
    assert cliente.get(f"{RUTA}/{reserva.id}").json() == {
        "id": reserva.id,
        "mesa_id": 5,
        "cliente_id": 7,
        "fecha": "2026-11-02",
        "hora": "21:30",
        "cantidad_personas": 4,
        "estado": "ATENDIDA",
    }


def test_post_comanda_de_reserva_hereda_la_mesa_de_la_reserva(
    cliente: TestClient, fabrica_reserva, puente_doble
) -> None:
    reserva = _de_hoy(fabrica_reserva, mesa_id=6)

    respuesta = _atender(cliente, reserva.id)

    assert respuesta.status_code == 201
    assert respuesta.json()["mesa_id"] == 6
    assert [llamada[0] for llamada in puente_doble.comandas] == [6]


def test_post_comanda_de_reserva_varias_lineas_con_producto_y_menu(
    cliente: TestClient, fabrica_reserva
) -> None:
    reserva = _de_hoy(fabrica_reserva)
    lineas = [{"producto_id": 12, "cantidad": 2}, MENU_5, {"producto_id": 13, "cantidad": 1}]

    respuesta = _atender(cliente, reserva.id, {"detalles": lineas})

    assert respuesta.status_code == 201
    assert [(d["producto_id"], d["menu_ejecutivo_id"]) for d in respuesta.json()["detalles"]] == [
        (12, None),
        (None, 5),
        (13, None),
    ]


def test_post_comanda_de_reserva_observaciones_opcionales(
    cliente: TestClient, fabrica_reserva
) -> None:
    con_observaciones = _de_hoy(fabrica_reserva, mesa_id=5)
    sin_observaciones = _de_hoy(fabrica_reserva, mesa_id=6)

    primera = _atender(cliente, con_observaciones.id, PEDIDO | {"observaciones": "Sin sal"})
    segunda = _atender(cliente, sin_observaciones.id)

    assert primera.json()["observaciones"] == "Sin sal"
    assert segunda.json()["observaciones"] is None


# Escenario "La reserva no gana ningun atributo"
def test_post_comanda_de_reserva_no_trae_cliente_propio_ni_agrega_comanda_id_a_la_reserva(
    cliente: TestClient, fabrica_reserva
) -> None:
    reserva = _de_hoy(fabrica_reserva)

    respuesta = _atender(cliente, reserva.id)
    reserva_atendida = cliente.get(f"{RUTA}/{reserva.id}").json()

    assert respuesta.status_code == 201
    assert not [clave for clave in respuesta.json() if "cliente" in clave]
    assert set(reserva_atendida) == CLAVES_DE_RESERVA  # sin `comanda_id` (S54)
    assert (reserva_atendida["cliente_id"], reserva_atendida["estado"]) == (7, "ATENDIDA")


def test_post_reservas_no_crea_ninguna_comanda(cliente: TestClient, puente_doble) -> None:
    respuesta = cliente.post(RUTA, json=CUERPO)

    assert respuesta.status_code == 201
    assert respuesta.json()["estado"] == "ACTIVA"
    assert puente_doble.comandas == []


# CA 2
@pytest.mark.parametrize(
    "estado", [EstadoReserva.CANCELADA_ANTICIPADA, EstadoReserva.CANCELADA_POR_AUSENCIA]
)
def test_post_comanda_de_reserva_cancelada_devuelve_409(
    cliente: TestClient, db: Session, fabrica_reserva, puente_doble, estado: EstadoReserva
) -> None:
    reserva = _de_hoy(fabrica_reserva, estado=estado)

    respuesta = _atender(cliente, reserva.id)

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": f"La reserva {reserva.id} ya fue cancelada"}
    assert _estado_de(db, reserva.id) == estado
    assert puente_doble.comandas == []


def test_post_comanda_de_reserva_atendida_devuelve_409(
    cliente: TestClient, db: Session, fabrica_reserva, puente_doble
) -> None:
    reserva = _de_hoy(fabrica_reserva, estado=EstadoReserva.ATENDIDA)

    respuesta = _atender(cliente, reserva.id)

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": f"La reserva {reserva.id} ya fue atendida"}
    assert _estado_de(db, reserva.id) == EstadoReserva.ATENDIDA
    assert puente_doble.comandas == []


def test_post_comanda_de_reserva_doble_envio_201_y_409(
    cliente: TestClient, db: Session, fabrica_reserva, puente_doble
) -> None:
    reserva = _de_hoy(fabrica_reserva)

    primera = _atender(cliente, reserva.id)
    segunda = _atender(cliente, reserva.id)

    assert primera.status_code == 201
    assert segunda.status_code == 409
    assert segunda.json() == {"detalle": f"La reserva {reserva.id} ya fue atendida"}
    assert len(puente_doble.comandas) == 1
    assert _estado_de(db, reserva.id) == EstadoReserva.ATENDIDA


# CA 3 (S57)
@pytest.mark.parametrize("fecha", [date(2026, 11, 3), date(2026, 11, 1)], ids=["manana", "ayer"])
def test_post_comanda_de_reserva_de_otra_fecha_devuelve_409(
    cliente: TestClient, db: Session, fabrica_reserva, puente_doble, fecha: date
) -> None:
    reserva = _de_hoy(fabrica_reserva, fecha=fecha)

    respuesta = _atender(cliente, reserva.id)

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": f"La reserva {reserva.id} no corresponde al día de hoy"}
    assert _estado_de(db, reserva.id) == EstadoReserva.ACTIVA
    assert puente_doble.comandas == []


# S28: "hoy" es el de la zona del restaurante (el servidor en UTC ya marca el 2 de noviembre)
def test_post_comanda_de_reserva_hoy_es_el_de_la_zona_del_restaurante(
    cliente: TestClient, fabrica_reserva, reloj_utc_fijo
) -> None:
    de_anoche = _de_hoy(fabrica_reserva, fecha=date(2026, 11, 1))
    de_la_fecha_del_servidor = _de_hoy(fabrica_reserva, fecha=date(2026, 11, 2))

    atendida = _atender(cliente, de_anoche.id)
    rechazada = _atender(cliente, de_la_fecha_del_servidor.id)

    assert atendida.status_code == 201
    assert rechazada.status_code == 409
    assert rechazada.json() == {
        "detalle": f"La reserva {de_la_fecha_del_servidor.id} no corresponde al día de hoy"
    }


# S63: solo cuenta la fecha
@pytest.mark.parametrize("hora", [time(21, 30), time(8, 0)], ids=["no-llego", "ya-paso"])
def test_post_comanda_de_reserva_no_verifica_la_hora(
    cliente: TestClient, fabrica_reserva, hora: time
) -> None:
    reserva = _de_hoy(fabrica_reserva, hora=hora)

    assert _atender(cliente, reserva.id).status_code == 201


# CA 4 y forma del pedido: el cuerpo se valida antes de leer la reserva (paso 1)
def _sin_cambios(db: Session, reserva_id: int, puente_doble) -> None:
    assert _estado_de(db, reserva_id) == EstadoReserva.ACTIVA
    assert puente_doble.comandas == []


@pytest.mark.parametrize("cantidad", [0, -3, 1.5, "2", True, None, "ausente"], ids=repr)
def test_post_comanda_de_reserva_cantidad_invalida_devuelve_422(
    cliente: TestClient, db: Session, fabrica_reserva, puente_doble, cantidad: object
) -> None:
    reserva = _de_hoy(fabrica_reserva)
    linea = {"producto_id": 12}
    if cantidad != "ausente":
        linea["cantidad"] = cantidad

    respuesta = _atender(cliente, reserva.id, {"detalles": [linea]})

    assert respuesta.status_code == 422
    assert respuesta.json()["detalle"].startswith("Datos invalidos.")
    assert "detalles.0.cantidad" in respuesta.json()["detalle"]
    _sin_cambios(db, reserva.id, puente_doble)


def test_post_comanda_de_reserva_una_linea_invalida_anula_todo_el_pedido(
    cliente: TestClient, db: Session, fabrica_reserva, puente_doble
) -> None:
    reserva = _de_hoy(fabrica_reserva)
    lineas = [{"producto_id": 12, "cantidad": 2}, {"producto_id": 13, "cantidad": 0}]

    respuesta = _atender(cliente, reserva.id, {"detalles": lineas})

    assert respuesta.status_code == 422
    assert "detalles.1.cantidad" in respuesta.json()["detalle"]
    _sin_cambios(db, reserva.id, puente_doble)


@pytest.mark.parametrize("cuerpo", [{}, {"detalles": []}, {"detalles": None}], ids=str)
def test_post_comanda_de_reserva_sin_detalles_devuelve_422(
    cliente: TestClient, db: Session, fabrica_reserva, puente_doble, cuerpo: dict
) -> None:
    reserva = _de_hoy(fabrica_reserva)

    respuesta = _atender(cliente, reserva.id, cuerpo)

    assert respuesta.status_code == 422
    assert respuesta.json()["detalle"].startswith("Datos invalidos.")
    assert "detalles" in respuesta.json()["detalle"]
    _sin_cambios(db, reserva.id, puente_doble)


@pytest.mark.parametrize(
    "linea",
    [{"producto_id": 12, "menu_ejecutivo_id": 5, "cantidad": 1}, {"cantidad": 1}],
    ids=["ambos", "ninguno"],
)
def test_post_comanda_de_reserva_producto_y_menu_o_ninguno_devuelve_422(
    cliente: TestClient, db: Session, fabrica_reserva, puente_doble, linea: dict
) -> None:
    reserva = _de_hoy(fabrica_reserva)

    respuesta = _atender(cliente, reserva.id, {"detalles": [linea]})

    assert respuesta.status_code == 422
    assert UNA_REFERENCIA in respuesta.json()["detalle"]
    _sin_cambios(db, reserva.id, puente_doble)


@pytest.mark.parametrize("producto_id", [0, -1, 2.5, "12", True], ids=repr)
def test_post_comanda_de_reserva_producto_id_invalido_devuelve_422(
    cliente: TestClient, db: Session, fabrica_reserva, puente_doble, producto_id: object
) -> None:
    reserva = _de_hoy(fabrica_reserva)

    respuesta = _atender(
        cliente, reserva.id, {"detalles": [{"producto_id": producto_id, "cantidad": 1}]}
    )

    assert respuesta.status_code == 422
    assert "detalles.0.producto_id" in respuesta.json()["detalle"]
    _sin_cambios(db, reserva.id, puente_doble)


def test_post_comanda_de_reserva_id_no_numerico_devuelve_422(
    cliente: TestClient, puente_doble
) -> None:
    respuesta = _atender(cliente, "abc")

    assert respuesta.status_code == 422
    assert "reserva_id" in respuesta.json()["detalle"]
    assert puente_doble.comandas == []


# S62: el cuerpo no trae mesa, reserva, estado ni cliente
@pytest.mark.parametrize(
    ("campo", "valor"),
    [("mesa_id", 6), ("reserva_id", 10), ("estado", "ATENDIDA"), ("cliente_id", 7)],
)
def test_post_comanda_de_reserva_con_campos_extra_devuelve_422(
    cliente: TestClient, db: Session, fabrica_reserva, puente_doble, campo: str, valor: object
) -> None:
    reserva = _de_hoy(fabrica_reserva)

    respuesta = _atender(cliente, reserva.id, PEDIDO | {campo: valor})

    assert respuesta.status_code == 422
    assert campo in respuesta.json()["detalle"]
    _sin_cambios(db, reserva.id, puente_doble)


# Existencia, S53 y orden de las verificaciones
def test_post_comanda_de_reserva_inexistente_devuelve_404(
    cliente: TestClient, puente_doble
) -> None:
    respuesta = _atender(cliente, 999)

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detalle": "La reserva 999 no existe"}
    assert puente_doble.comandas == []


@pytest.mark.parametrize("lineas", [[MENU_5], [MENU_5, MENU_6]], ids=["una-linea", "varias"])
def test_post_comanda_de_reserva_solo_menus_devuelve_422(
    cliente: TestClient, db: Session, fabrica_reserva, puente_doble, lineas: list[dict]
) -> None:
    reserva = _de_hoy(fabrica_reserva)

    respuesta = _atender(cliente, reserva.id, {"detalles": lineas})

    assert respuesta.status_code == 422
    assert respuesta.json() == {"detalle": AL_MENOS_UN_PRODUCTO}
    _sin_cambios(db, reserva.id, puente_doble)


def test_post_comanda_de_reserva_orden_de_las_verificaciones(
    cliente: TestClient, fabrica_reserva, puente_doble
) -> None:
    manana = date(2026, 11, 3)
    cancelada = _de_hoy(fabrica_reserva, estado=EstadoReserva.CANCELADA_ANTICIPADA)
    atendida_de_manana = _de_hoy(fabrica_reserva, fecha=manana, estado=EstadoReserva.ATENDIDA)
    de_manana = _de_hoy(fabrica_reserva, fecha=manana)
    de_hoy = _de_hoy(fabrica_reserva, mesa_id=6)
    sin_productos = {"detalles": [MENU_5]}
    invocaciones = []
    puente_doble.efecto = invocaciones.append  # queda anotado si se llamo, aunque falle
    puente_doble.falla = ReglaDeNegocioError("La mesa 6 no está libre")

    # el cuerpo invalido gana a la reserva inexistente y a la cancelada
    vacio = _atender(cliente, 999, {"detalles": []})
    sin_cantidad = {"detalles": [{"producto_id": 12, "cantidad": 0}]}
    cantidad_cero = _atender(cliente, cancelada.id, sin_cantidad)
    # atendida gana a otra fecha; otra fecha gana a un pedido sin productos
    atendida = _atender(cliente, atendida_de_manana.id)
    otra_fecha = _atender(cliente, de_manana.id, sin_productos)
    # un pedido sin productos gana a los errores de M4
    sin_producto = _atender(cliente, de_hoy.id, sin_productos)

    assert vacio.status_code == 422
    assert cantidad_cero.status_code == 422
    assert atendida.json() == {"detalle": f"La reserva {atendida_de_manana.id} ya fue atendida"}
    assert otra_fecha.json() == {
        "detalle": f"La reserva {de_manana.id} no corresponde al día de hoy"
    }
    assert sin_producto.status_code == 422
    assert sin_producto.json() == {"detalle": AL_MENOS_UN_PRODUCTO}
    assert invocaciones == []


# Errores de M4 (paso 7): llegan con su codigo y su detalle, sin cambios en la reserva
ERRORES_DE_M4 = [
    (NoEncontradoError("El producto 99 no existe"), 404),
    (ReglaDeNegocioError("El producto Milanesa está deshabilitado"), 409),
    (ReglaDeNegocioError("El menú ejecutivo Del día está deshabilitado"), 409),
    (ReglaDeNegocioError("La mesa 5 no está libre"), 409),
    (ComandaAbiertaError(31), 409),
    (NoEncontradoError("La mesa 5 no existe"), 404),
]


@pytest.mark.parametrize(("falla", "codigo"), ERRORES_DE_M4, ids=lambda valor: str(valor)[:30])
def test_post_comanda_de_reserva_error_de_m4_conserva_codigo_y_detalle(
    cliente: TestClient,
    db: Session,
    fabrica_reserva,
    puente_doble,
    falla: Exception,
    codigo: int,
) -> None:
    reserva = _de_hoy(fabrica_reserva)
    puente_doble.falla = falla

    respuesta = _atender(cliente, reserva.id)

    assert respuesta.status_code == codigo
    assert respuesta.json()["detalle"] == str(falla)
    _sin_cambios(db, reserva.id, puente_doble)


def test_post_comanda_de_reserva_se_atiende_cuando_la_mesa_se_libera(
    cliente: TestClient, db: Session, fabrica_reserva, puente_doble
) -> None:
    reserva = _de_hoy(fabrica_reserva)
    puente_doble.falla = ReglaDeNegocioError("La mesa 5 no está libre")
    rechazada = _atender(cliente, reserva.id)
    puente_doble.falla = None

    atendida = _atender(cliente, reserva.id)

    assert (rechazada.status_code, atendida.status_code) == (409, 201)
    assert _estado_de(db, reserva.id) == EstadoReserva.ATENDIDA


# Atomicidad: si falla el commit, la respuesta es 500 y la sesion se deshace
def test_post_comanda_de_reserva_falla_el_commit_devuelve_500_y_deshace(
    cliente: TestClient, db: Session, fabrica_reserva, monkeypatch: pytest.MonkeyPatch
) -> None:
    reserva = _de_hoy(fabrica_reserva)
    sin_relanzar = TestClient(app, raise_server_exceptions=False)

    def commit_roto() -> None:
        db.flush()  # el cambio llega a la transaccion, pero el commit falla
        raise OperationalError("COMMIT", {}, Exception("disk I/O error"))

    monkeypatch.setattr(db, "commit", commit_roto)

    respuesta = sin_relanzar.post(_ruta_comanda(reserva.id), json=PEDIDO)

    assert respuesta.status_code == 500
    assert _estado_de(db, reserva.id) == EstadoReserva.ACTIVA


# La atencion es terminal: la reserva atendida no se modifica ni se cancela y se lista con su estado
def test_post_comanda_de_reserva_deja_la_reserva_terminal(
    cliente: TestClient, fabrica_reserva
) -> None:
    reserva = _de_hoy(fabrica_reserva)
    assert _atender(cliente, reserva.id).status_code == 201

    modificacion = cliente.put(f"{RUTA}/{reserva.id}", json=CUERPO_PUT)
    cancelaciones = [
        cliente.post(f"{RUTA}/{reserva.id}/cancelar-anticipada"),
        cliente.post(f"{RUTA}/{reserva.id}/cancelar-por-ausencia"),
    ]
    atendidas = cliente.get(RUTA, params={"fecha": "2026-11-02", "estado": "ATENDIDA"})
    activas = cliente.get(RUTA, params={"fecha": "2026-11-02", "estado": "ACTIVA"})

    assert modificacion.status_code == 409
    assert modificacion.json() == {
        "detalle": f"La reserva {reserva.id} no está activa y no se puede modificar"
    }
    for cancelacion in cancelaciones:
        assert cancelacion.status_code == 409
        assert cancelacion.json() == {
            "detalle": f"La reserva {reserva.id} ya fue atendida y no se puede cancelar"
        }
    assert [item["id"] for item in atendidas.json()["items"]] == [reserva.id]
    assert activas.json()["items"] == []
