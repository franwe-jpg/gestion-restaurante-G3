"""Pruebas del reporte de recaudación por medio de pago (HU-M6-08): repository, service y HTTP."""

from datetime import UTC, datetime
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.pagos import repository
from app.modules.pagos.models import Cobro, EstadoFactura, Factura, TipoMedioPago
from tests.modules.pagos.conftest import FabricaCobro, FabricaFactura, FabricaMedioPago

RUTA = "/api/v1/reportes/recaudacion-por-medio-de-pago"
PERIODO = {"fecha_desde": "2026-10-01", "fecha_hasta": "2026-10-31"}
# 15:00 UTC = 12:00 en el restaurante (UTC-3).
MITAD = datetime(2026, 10, 15, 15, 0, tzinfo=UTC)
SIN_DEUDA = {"cantidad_facturas": 0, "monto": "0.00"}


def _consultar(cliente: TestClient, **parametros: str) -> dict:
    respuesta = cliente.get(RUTA, params=parametros or PERIODO)
    assert respuesta.status_code == 200
    return respuesta.json()


def _cobrado(cliente: TestClient, **parametros: str) -> str:
    return _consultar(cliente, **parametros)["total_cobrado"]


def test_reporte_agrupa_por_medio_ordenado_por_nombre_con_el_total(
    cliente: TestClient, fabrica_medio_pago: FabricaMedioPago, fabrica_cobro: FabricaCobro
) -> None:
    tarjeta = fabrica_medio_pago("Tarjeta", TipoMedioPago.TARJETA)
    efectivo = fabrica_medio_pago("Efectivo")
    fabrica_cobro(tarjeta.id, "2000.00", MITAD)
    fabrica_cobro(efectivo.id, "1000.00", MITAD)
    fabrica_cobro(efectivo.id, "500.00", MITAD)

    cuerpo = _consultar(cliente)

    assert cuerpo["fecha_desde"] == "2026-10-01"
    assert cuerpo["fecha_hasta"] == "2026-10-31"
    assert cuerpo["total_cobrado"] == "3500.00"
    assert cuerpo["por_medio_pago"] == [
        {
            "medio_pago_id": efectivo.id,
            "nombre": "Efectivo",
            "tipo": "EFECTIVO",
            "cantidad_cobros": 2,
            "monto": "1500.00",
        },
        {
            "medio_pago_id": tarjeta.id,
            "nombre": "Tarjeta",
            "tipo": "TARJETA",
            "cantidad_cobros": 1,
            "monto": "2000.00",
        },
    ]


def test_reporte_no_cuenta_los_cobros_fuera_del_periodo(
    cliente: TestClient, fabrica_medio_pago: FabricaMedioPago, fabrica_cobro: FabricaCobro
) -> None:
    medio = fabrica_medio_pago()
    fabrica_cobro(medio.id, "1.00", datetime(2026, 10, 1, 2, 59, 59, tzinfo=UTC))  # 30/09 23:59
    fabrica_cobro(medio.id, "2.00", datetime(2026, 11, 1, 3, 0, tzinfo=UTC))  # 01/11 00:00
    fabrica_cobro(medio.id, "4.00", MITAD)

    assert _cobrado(cliente) == "4.00"


def test_reporte_no_lista_un_medio_sin_cobros_en_el_periodo(
    cliente: TestClient, fabrica_medio_pago: FabricaMedioPago, fabrica_cobro: FabricaCobro
) -> None:
    fabrica_medio_pago("Sin uso")
    usado = fabrica_medio_pago("Usado")
    fabrica_cobro(usado.id, "10.00", MITAD)

    nombres = [medio["nombre"] for medio in _consultar(cliente)["por_medio_pago"]]

    assert nombres == ["Usado"]


def test_reporte_incluye_un_medio_dado_de_baja_con_cobros(
    cliente: TestClient, fabrica_medio_pago: FabricaMedioPago, fabrica_cobro: FabricaCobro
) -> None:
    baja = fabrica_medio_pago("Cheque", eliminado=True)
    fabrica_cobro(baja.id, "300.00", MITAD)

    cuerpo = _consultar(cliente)

    assert [medio["nombre"] for medio in cuerpo["por_medio_pago"]] == ["Cheque"]
    assert cuerpo["total_cobrado"] == "300.00"


@pytest.mark.parametrize(
    ("instante", "cuenta"),
    [
        (datetime(2026, 10, 1, 3, 0, tzinfo=UTC), True),  # 00:00 local de desde
        (datetime(2026, 10, 1, 2, 59, 59, tzinfo=UTC), False),
        (datetime(2026, 11, 1, 2, 59, tzinfo=UTC), True),  # 23:59 local de hasta
        (datetime(2026, 11, 1, 3, 0, tzinfo=UTC), False),  # 00:00 local de hasta + 1
    ],
)
def test_reporte_respeta_los_limites_del_periodo_en_utc_menos_3(
    cliente: TestClient,
    fabrica_medio_pago: FabricaMedioPago,
    fabrica_cobro: FabricaCobro,
    instante: datetime,
    cuenta: bool,
) -> None:
    fabrica_cobro(fabrica_medio_pago().id, "5.00", instante)

    assert _cobrado(cliente) == ("5.00" if cuenta else "0.00")


def test_reporte_con_fechas_iguales_incluye_los_cobros_de_ese_dia(
    cliente: TestClient, fabrica_medio_pago: FabricaMedioPago, fabrica_cobro: FabricaCobro
) -> None:
    fabrica_cobro(fabrica_medio_pago().id, "9.00", MITAD)

    dia = {"fecha_desde": "2026-10-15", "fecha_hasta": "2026-10-15"}

    assert _cobrado(cliente, **dia) == "9.00"


def test_reporte_suma_la_deuda_de_las_facturas_adeudadas_del_periodo(
    cliente: TestClient, fabrica_factura: FabricaFactura
) -> None:
    fabrica_factura("800.00", EstadoFactura.ADEUDADA, fecha_emision=MITAD)
    fabrica_factura("450.50", EstadoFactura.ADEUDADA, fecha_emision=MITAD)

    cuerpo = _consultar(cliente)

    assert cuerpo["adeudado"] == {"cantidad_facturas": 2, "monto": "1250.50"}
    assert cuerpo["por_medio_pago"] == []


def test_reporte_devuelve_cobrado_y_adeudado_en_la_misma_respuesta(
    cliente: TestClient,
    fabrica_medio_pago: FabricaMedioPago,
    fabrica_cobro: FabricaCobro,
    fabrica_factura: FabricaFactura,
) -> None:
    fabrica_cobro(fabrica_medio_pago().id, "100.00", MITAD)
    fabrica_factura("800.00", EstadoFactura.ADEUDADA, fecha_emision=MITAD)

    cuerpo = _consultar(cliente)

    assert cuerpo["total_cobrado"] == "100.00"
    assert cuerpo["adeudado"]["monto"] == "800.00"


def test_reporte_no_cuenta_como_deuda_una_factura_pagada(
    cliente: TestClient, fabrica_factura: FabricaFactura
) -> None:
    fabrica_factura("0.00", EstadoFactura.PAGADA, fecha_emision=MITAD)

    assert _consultar(cliente)["adeudado"] == SIN_DEUDA


def test_reporte_cuenta_una_factura_con_cobro_parcial_por_su_saldo(
    cliente: TestClient, fabrica_factura: FabricaFactura
) -> None:
    fabrica_factura("600.00", EstadoFactura.ADEUDADA, total="1000.00", fecha_emision=MITAD)

    assert _consultar(cliente)["adeudado"] == {"cantidad_facturas": 1, "monto": "600.00"}


@pytest.mark.parametrize(
    ("emision", "cuenta"),
    [
        (datetime(2026, 9, 30, 12, 0, tzinfo=UTC), False),
        (datetime(2026, 11, 1, 12, 0, tzinfo=UTC), False),
        (datetime(2026, 11, 1, 2, 30, tzinfo=UTC), True),  # 31/10 23:30 local
        (datetime(2026, 11, 1, 3, 0, tzinfo=UTC), False),  # 01/11 00:00 local
    ],
)
def test_reporte_filtra_la_deuda_con_el_mismo_intervalo_del_periodo(
    cliente: TestClient, fabrica_factura: FabricaFactura, emision: datetime, cuenta: bool
) -> None:
    fabrica_factura("100.00", EstadoFactura.ADEUDADA, fecha_emision=emision)

    cantidad = _consultar(cliente)["adeudado"]["cantidad_facturas"]

    assert cantidad == (1 if cuenta else 0)


def test_reporte_sin_cobros_ni_deuda_responde_200_en_cero(cliente: TestClient) -> None:
    assert _consultar(cliente) == {
        "fecha_desde": "2026-10-01",
        "fecha_hasta": "2026-10-31",
        "por_medio_pago": [],
        "total_cobrado": "0.00",
        "adeudado": SIN_DEUDA,
    }


def test_reporte_con_deuda_sin_cobros_informa_la_deuda_y_cero_cobrado(
    cliente: TestClient, fabrica_factura: FabricaFactura
) -> None:
    fabrica_factura("800.00", EstadoFactura.ADEUDADA, fecha_emision=MITAD)

    cuerpo = _consultar(cliente)

    assert cuerpo["por_medio_pago"] == []
    assert cuerpo["total_cobrado"] == "0.00"
    assert cuerpo["adeudado"]["monto"] == "800.00"


def test_reporte_con_cobros_sin_deuda_deja_el_adeudado_en_cero(
    cliente: TestClient, fabrica_medio_pago: FabricaMedioPago, fabrica_cobro: FabricaCobro
) -> None:
    fabrica_cobro(fabrica_medio_pago().id, "50.00", MITAD)

    assert _consultar(cliente)["adeudado"] == SIN_DEUDA


@pytest.mark.parametrize(
    ("parametros", "mensaje"),
    [
        ({}, "Faltan la fecha desde y la fecha hasta."),
        ({"fecha_hasta": "2026-10-31"}, "Falta la fecha desde."),
        ({"fecha_desde": "2026-10-01"}, "Falta la fecha hasta."),
        (
            {"fecha_desde": "2026-10-31", "fecha_hasta": "2026-10-01"},
            "El período es inválido: la fecha desde es posterior a la fecha hasta.",
        ),
    ],
)
@pytest.mark.parametrize("sufijo", ["", "/pdf"])
def test_reporte_rechaza_un_periodo_invalido_con_422(
    cliente: TestClient, parametros: dict[str, str], mensaje: str, sufijo: str
) -> None:
    respuesta = cliente.get(RUTA + sufijo, params=parametros)

    assert respuesta.status_code == 422
    assert respuesta.json() == {"detalle": mensaje}


def test_reporte_rechaza_una_fecha_con_formato_invalido(cliente: TestClient) -> None:
    respuesta = cliente.get(RUTA, params={"fecha_desde": "15/10/2026", "fecha_hasta": "2026-10-31"})

    assert respuesta.status_code == 422
    assert "fecha_desde" in respuesta.json()["detalle"]


def test_un_periodo_invalido_no_ejecuta_consultas(
    cliente: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def fallar(*_: object, **__: object) -> None:
        raise AssertionError("no debe consultar")

    monkeypatch.setattr(repository, "sumar_cobros_por_medio", fallar)
    monkeypatch.setattr(repository, "resumir_facturas_adeudadas", fallar)

    assert cliente.get(RUTA, params={"fecha_desde": "2026-10-31"}).status_code == 422


def test_pdf_con_datos_se_descarga_con_el_nombre_del_periodo(
    cliente: TestClient, fabrica_medio_pago: FabricaMedioPago, fabrica_cobro: FabricaCobro
) -> None:
    fabrica_cobro(fabrica_medio_pago().id, "50.00", MITAD)

    respuesta = cliente.get(RUTA + "/pdf", params=PERIODO)

    assert respuesta.status_code == 200
    assert respuesta.headers["content-type"] == "application/pdf"
    assert respuesta.headers["content-disposition"] == (
        'attachment; filename="recaudacion-medio-pago_2026-10-01_2026-10-31.pdf"'
    )
    assert respuesta.content.startswith(b"%PDF")


def test_pdf_sin_datos_tambien_se_genera(cliente: TestClient) -> None:
    respuesta = cliente.get(RUTA + "/pdf", params=PERIODO)

    assert respuesta.status_code == 200
    assert respuesta.headers["content-type"] == "application/pdf"
    assert respuesta.content.startswith(b"%PDF")


def test_la_deuda_sin_argumentos_cuenta_todas_las_adeudadas(
    db: Session, fabrica_factura: FabricaFactura
) -> None:
    fabrica_factura("10.00", EstadoFactura.ADEUDADA, fecha_emision=MITAD)
    fabrica_factura("20.00", EstadoFactura.ADEUDADA, fecha_emision=datetime(2020, 1, 1, tzinfo=UTC))

    assert repository.resumir_facturas_adeudadas(db) == (2, Decimal("30.00"))


def test_la_deuda_con_desde_y_hasta_filtra_por_fecha_de_emision(
    db: Session, fabrica_factura: FabricaFactura
) -> None:
    fabrica_factura("10.00", EstadoFactura.ADEUDADA, fecha_emision=MITAD)
    fabrica_factura("20.00", EstadoFactura.ADEUDADA, fecha_emision=datetime(2020, 1, 1, tzinfo=UTC))

    desde = datetime(2026, 10, 1, 3, 0, tzinfo=UTC)
    hasta = datetime(2026, 11, 1, 3, 0, tzinfo=UTC)

    assert repository.resumir_facturas_adeudadas(db, desde, hasta) == (1, Decimal("10.00"))


def test_el_reporte_es_de_solo_lectura(
    cliente: TestClient,
    db: Session,
    fabrica_medio_pago: FabricaMedioPago,
    fabrica_cobro: FabricaCobro,
    fabrica_factura: FabricaFactura,
) -> None:
    fabrica_cobro(fabrica_medio_pago().id, "50.00", MITAD)
    fabrica_factura("80.00", EstadoFactura.ADEUDADA, fecha_emision=MITAD)
    antes = (db.query(Cobro).count(), db.query(Factura).count())

    cliente.get(RUTA, params=PERIODO)
    cliente.get(RUTA + "/pdf", params=PERIODO)

    assert (db.query(Cobro).count(), db.query(Factura).count()) == antes
