"""Pruebas HTTP del reporte de reservas y ausentismo (HU-M5-07): JSON y PDF."""

from collections.abc import Callable
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.reservas import repository
from app.modules.reservas.models import EstadoReserva, Reserva

RUTA = "/api/v1/reportes/reservas-ausentismo"
RUTA_PDF = f"{RUTA}/pdf"
PERIODO = {"fecha_desde": "2026-10-01", "fecha_hasta": "2026-10-31"}


def _seis_reservas(fabrica_reserva: Callable) -> None:
    """Dos ACTIVA, una ATENDIDA, dos CANCELADA_ANTICIPADA y una CANCELADA_POR_AUSENCIA."""
    fabrica_reserva(mesa_id=1, fecha=date(2026, 10, 5), estado=EstadoReserva.ACTIVA)
    fabrica_reserva(mesa_id=2, fecha=date(2026, 10, 6), estado=EstadoReserva.ACTIVA)
    fabrica_reserva(mesa_id=3, fecha=date(2026, 10, 10), estado=EstadoReserva.ATENDIDA)
    fabrica_reserva(mesa_id=4, fecha=date(2026, 10, 15), estado=EstadoReserva.CANCELADA_ANTICIPADA)
    fabrica_reserva(mesa_id=5, fecha=date(2026, 10, 20), estado=EstadoReserva.CANCELADA_ANTICIPADA)
    fabrica_reserva(
        mesa_id=6, fecha=date(2026, 10, 25), estado=EstadoReserva.CANCELADA_POR_AUSENCIA
    )


# Camino feliz con reservas en los cuatro estados
def test_reporte_camino_feliz_con_reservas_en_los_cuatro_estados(
    cliente: TestClient, fabrica_reserva
) -> None:
    _seis_reservas(fabrica_reserva)

    respuesta = cliente.get(RUTA, params=PERIODO)

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["fecha_desde"] == "2026-10-01"
    assert cuerpo["fecha_hasta"] == "2026-10-31"
    assert cuerpo["total_reservas"] == 6
    assert cuerpo["atendidas"] == 1
    assert cuerpo["canceladas_anticipada"] == 2
    assert cuerpo["canceladas_por_ausencia"] == 1
    assert cuerpo["porcentaje_ausentismo"] == "16.67"


# Reservas fuera del período no se cuentan
def test_reporte_no_cuenta_reservas_fuera_del_periodo(cliente: TestClient, fabrica_reserva) -> None:
    _seis_reservas(fabrica_reserva)
    fabrica_reserva(mesa_id=7, fecha=date(2026, 9, 30), estado=EstadoReserva.ATENDIDA)
    fabrica_reserva(mesa_id=8, fecha=date(2026, 11, 1), estado=EstadoReserva.CANCELADA_POR_AUSENCIA)

    cuerpo = cliente.get(RUTA, params=PERIODO).json()

    assert cuerpo["total_reservas"] == 6
    assert cuerpo["atendidas"] == 1
    assert cuerpo["canceladas_anticipada"] == 2
    assert cuerpo["canceladas_por_ausencia"] == 1


# Período de un solo día
def test_reporte_periodo_de_un_solo_dia(cliente: TestClient, fabrica_reserva) -> None:
    fabrica_reserva(fecha=date(2026, 10, 15), estado=EstadoReserva.ATENDIDA)

    cuerpo = cliente.get(
        RUTA, params={"fecha_desde": "2026-10-15", "fecha_hasta": "2026-10-15"}
    ).json()

    assert cuerpo["total_reservas"] == 1
    assert cuerpo["atendidas"] == 1


# Período sin ninguna reserva
def test_reporte_sin_ninguna_reserva_responde_200_con_ceros_y_porcentaje_null(
    cliente: TestClient,
) -> None:
    respuesta = cliente.get(RUTA, params={"fecha_desde": "2026-01-01", "fecha_hasta": "2026-01-31"})

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert (
        cuerpo["total_reservas"],
        cuerpo["atendidas"],
        cuerpo["canceladas_anticipada"],
        cuerpo["canceladas_por_ausencia"],
        cuerpo["porcentaje_ausentismo"],
    ) == (0, 0, 0, 0, None)


# Período sin reservas propias, aunque existan reservas en otras fechas
def test_reporte_sin_reservas_propias_aunque_existan_en_otras_fechas(
    cliente: TestClient, fabrica_reserva
) -> None:
    fabrica_reserva(fecha=date(2026, 2, 1), estado=EstadoReserva.ACTIVA)

    cuerpo = cliente.get(
        RUTA, params={"fecha_desde": "2026-01-01", "fecha_hasta": "2026-01-31"}
    ).json()

    assert cuerpo["total_reservas"] == 0
    assert cuerpo["porcentaje_ausentismo"] is None


# Validación del período: los cuatro mensajes de 422
def test_reporte_faltan_las_dos_fechas(cliente: TestClient) -> None:
    respuesta = cliente.get(RUTA)

    assert respuesta.status_code == 422
    assert respuesta.json() == {"detalle": "Faltan la fecha desde y la fecha hasta."}


def test_reporte_falta_la_fecha_desde(cliente: TestClient) -> None:
    respuesta = cliente.get(RUTA, params={"fecha_hasta": "2026-10-31"})

    assert respuesta.status_code == 422
    assert respuesta.json() == {"detalle": "Falta la fecha desde."}


def test_reporte_falta_la_fecha_hasta(cliente: TestClient) -> None:
    respuesta = cliente.get(RUTA, params={"fecha_desde": "2026-10-01"})

    assert respuesta.status_code == 422
    assert respuesta.json() == {"detalle": "Falta la fecha hasta."}


def test_reporte_fecha_desde_posterior_a_fecha_hasta(cliente: TestClient) -> None:
    respuesta = cliente.get(RUTA, params={"fecha_desde": "2026-10-31", "fecha_hasta": "2026-10-01"})

    assert respuesta.status_code == 422
    assert respuesta.json() == {
        "detalle": "El período es inválido: la fecha desde es posterior a la fecha hasta."
    }


# Las dos fechas iguales son un período válido (contraste con el caso anterior)
def test_reporte_las_dos_fechas_iguales_es_un_periodo_valido(
    cliente: TestClient, fabrica_reserva
) -> None:
    fabrica_reserva(fecha=date(2026, 10, 15), estado=EstadoReserva.ATENDIDA)

    respuesta = cliente.get(RUTA, params={"fecha_desde": "2026-10-15", "fecha_hasta": "2026-10-15"})

    assert respuesta.status_code == 200


# Formato de fecha inválido, nombrando fecha_desde
def test_reporte_formato_de_fecha_invalido_nombra_fecha_desde(cliente: TestClient) -> None:
    respuesta = cliente.get(RUTA, params={"fecha_desde": "15/10/2026", "fecha_hasta": "2026-10-31"})

    assert respuesta.status_code == 422
    assert "fecha_desde" in respuesta.json()["detalle"]


# Bordes del período: fecha_desde y fecha_hasta cuentan; un día antes/después no
def test_reporte_reserva_exactamente_en_fecha_desde_cuenta(
    cliente: TestClient, fabrica_reserva
) -> None:
    fabrica_reserva(fecha=date(2026, 10, 1), estado=EstadoReserva.ACTIVA)

    cuerpo = cliente.get(RUTA, params=PERIODO).json()

    assert cuerpo["total_reservas"] == 1


def test_reporte_reserva_exactamente_en_fecha_hasta_cuenta(
    cliente: TestClient, fabrica_reserva
) -> None:
    fabrica_reserva(fecha=date(2026, 10, 31), estado=EstadoReserva.ATENDIDA)

    cuerpo = cliente.get(RUTA, params=PERIODO).json()

    assert cuerpo["total_reservas"] == 1
    assert cuerpo["atendidas"] == 1


def test_reporte_un_dia_antes_de_fecha_desde_no_cuenta(
    cliente: TestClient, fabrica_reserva
) -> None:
    fabrica_reserva(fecha=date(2026, 9, 30), estado=EstadoReserva.CANCELADA_POR_AUSENCIA)

    respuesta = cliente.get(RUTA, params=PERIODO)

    assert respuesta.status_code == 200
    assert respuesta.json()["total_reservas"] == 0
    assert respuesta.json()["porcentaje_ausentismo"] is None


def test_reporte_un_dia_despues_de_fecha_hasta_no_cuenta(
    cliente: TestClient, fabrica_reserva
) -> None:
    fabrica_reserva(fecha=date(2026, 11, 1), estado=EstadoReserva.CANCELADA_POR_AUSENCIA)

    respuesta = cliente.get(RUTA, params=PERIODO)

    assert respuesta.status_code == 200
    assert respuesta.json()["total_reservas"] == 0
    assert respuesta.json()["porcentaje_ausentismo"] is None


# Un período inválido no ejecuta ninguna consulta de conteo
def test_reporte_periodo_invalido_no_ejecuta_la_consulta(
    cliente: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def falla(*_args, **_kwargs):
        raise AssertionError("un período inválido no debe consultar el conteo")

    monkeypatch.setattr(repository, "contar_reservas_por_estado", falla)

    respuesta = cliente.get(RUTA)

    assert respuesta.status_code == 422


# /pdf
def test_reporte_pdf_con_datos_responde_el_archivo_adjunto_con_el_periodo_en_el_nombre(
    cliente: TestClient, fabrica_reserva
) -> None:
    _seis_reservas(fabrica_reserva)

    respuesta = cliente.get(RUTA_PDF, params=PERIODO)

    assert respuesta.status_code == 200
    assert respuesta.headers["content-type"] == "application/pdf"
    assert respuesta.headers["content-disposition"] == (
        'attachment; filename="reservas-ausentismo_2026-10-01_2026-10-31.pdf"'
    )
    assert respuesta.content.startswith(b"%PDF")


def test_reporte_pdf_sin_datos_responde_200_con_pdf(cliente: TestClient) -> None:
    respuesta = cliente.get(
        RUTA_PDF, params={"fecha_desde": "2026-01-01", "fecha_hasta": "2026-01-31"}
    )

    assert respuesta.status_code == 200
    assert respuesta.headers["content-type"] == "application/pdf"
    assert respuesta.content.startswith(b"%PDF")


# La ruta /pdf valida el período igual que la ruta JSON: 422 JSON, no un PDF de error
def test_reporte_pdf_con_periodo_inverso_responde_422_json_no_pdf(cliente: TestClient) -> None:
    respuesta = cliente.get(
        RUTA_PDF, params={"fecha_desde": "2026-10-31", "fecha_hasta": "2026-10-01"}
    )

    assert respuesta.status_code == 422
    assert respuesta.headers["content-type"].startswith("application/json")
    assert respuesta.json() == {
        "detalle": "El período es inválido: la fecha desde es posterior a la fecha hasta."
    }


# Solo lectura: ninguna reserva cambia tras pedir el reporte en JSON y en PDF
def test_reporte_no_modifica_ninguna_reserva(
    cliente: TestClient, db: Session, fabrica_reserva
) -> None:
    _seis_reservas(fabrica_reserva)
    antes = [(r.id, r.estado, r.fecha) for r in db.scalars(select(Reserva).order_by(Reserva.id))]

    cliente.get(RUTA, params=PERIODO)
    cliente.get(RUTA_PDF, params=PERIODO)
    db.expire_all()

    despues = [(r.id, r.estado, r.fecha) for r in db.scalars(select(Reserva).order_by(Reserva.id))]
    assert despues == antes
