"""Pruebas de la caja del dia (S4-06, escenarios K01 a K11)."""

from datetime import UTC, datetime
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.modules.pagos import repository, service
from app.modules.pagos.models import Cobro, EstadoFactura, Factura, TipoMedioPago
from tests.modules.pagos.conftest import (
    HOY_A_LAS_10,
    FabricaCobro,
    FabricaFactura,
    FabricaMedioPago,
)

RUTA = "/api/v1/reportes/caja-del-dia"
# 12:00 UTC = 09:00 en el restaurante (UTC-3): el dia va de 03:00 UTC de hoy a 03:00 UTC de manana.
AHORA = datetime(2026, 11, 9, 12, 0, tzinfo=UTC)


@pytest.fixture(autouse=True)
def reloj_fijo(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(service, "_ahora", lambda: AHORA)


# K01
def test_caja_del_dia_agrupa_los_cobros_de_hoy_por_medio_de_pago(
    cliente: TestClient,
    fabrica_medio_pago: FabricaMedioPago,
    fabrica_cobro: FabricaCobro,
) -> None:
    efectivo = fabrica_medio_pago("Efectivo")
    tarjeta = fabrica_medio_pago("Tarjeta", TipoMedioPago.TARJETA)
    fabrica_cobro(efectivo.id, "1000.00")
    fabrica_cobro(efectivo.id, "500.00")
    fabrica_cobro(tarjeta.id, "2000.00")

    respuesta = cliente.get(RUTA)

    assert respuesta.status_code == 200
    assert respuesta.json() == {
        "fecha": "2026-11-09",
        "por_medio_pago": [
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
        ],
        "total_cobrado": "3500.00",
        "adeudado": {"cantidad_facturas": 0, "monto": "0.00"},
    }


def test_caja_del_dia_ordena_los_medios_por_nombre(
    cliente: TestClient, fabrica_medio_pago: FabricaMedioPago, fabrica_cobro: FabricaCobro
) -> None:
    zeta = fabrica_medio_pago("Zeta")
    alfa = fabrica_medio_pago("Alfa")
    fabrica_cobro(zeta.id, "1.00")
    fabrica_cobro(alfa.id, "1.00")

    nombres = [medio["nombre"] for medio in cliente.get(RUTA).json()["por_medio_pago"]]

    assert nombres == ["Alfa", "Zeta"]


# K02
def test_obtener_caja_del_dia_usa_el_dia_del_restaurante_utc_menos_3(
    db: Session, fabrica_medio_pago: FabricaMedioPago, fabrica_cobro: FabricaCobro
) -> None:
    medio = fabrica_medio_pago()
    fabrica_cobro(medio.id, "100.00", datetime(2026, 11, 9, 1, 0, tzinfo=UTC))  # anoche en UTC-3
    fabrica_cobro(medio.id, "200.00", datetime(2026, 11, 9, 4, 0, tzinfo=UTC))  # hoy 01:00 en UTC-3

    caja = service.obtener_caja_del_dia(db, AHORA)

    assert caja.total_cobrado == Decimal("200.00")
    assert caja.por_medio_pago[0].cantidad_cobros == 1


def test_obtener_caja_del_dia_el_limite_es_semiabierto(
    db: Session, fabrica_medio_pago: FabricaMedioPago, fabrica_cobro: FabricaCobro
) -> None:
    medio = fabrica_medio_pago()
    fabrica_cobro(medio.id, "1.00", datetime(2026, 11, 9, 2, 59, 59, tzinfo=UTC))
    fabrica_cobro(medio.id, "2.00", datetime(2026, 11, 9, 3, 0, tzinfo=UTC))
    fabrica_cobro(medio.id, "4.00", datetime(2026, 11, 10, 3, 0, tzinfo=UTC))

    caja = service.obtener_caja_del_dia(db, AHORA)

    assert caja.total_cobrado == Decimal("2.00")


def test_obtener_caja_del_dia_con_el_reloj_ya_en_manana_utc_usa_el_dia_del_restaurante(
    db: Session, fabrica_medio_pago: FabricaMedioPago, fabrica_cobro: FabricaCobro
) -> None:
    medio = fabrica_medio_pago()
    fabrica_cobro(medio.id, "7.00", datetime(2026, 11, 9, 23, 0, tzinfo=UTC))

    caja = service.obtener_caja_del_dia(db, datetime(2026, 11, 10, 1, 0, tzinfo=UTC))

    assert caja.fecha.isoformat() == "2026-11-09"
    assert caja.total_cobrado == Decimal("7.00")


# K03
def test_caja_del_dia_ignora_cobros_de_ayer_y_de_manana(
    cliente: TestClient, fabrica_medio_pago: FabricaMedioPago, fabrica_cobro: FabricaCobro
) -> None:
    medio = fabrica_medio_pago()
    fabrica_cobro(medio.id, "10.00", datetime(2026, 11, 8, 12, 0, tzinfo=UTC))
    fabrica_cobro(medio.id, "20.00", datetime(2026, 11, 10, 12, 0, tzinfo=UTC))

    cuerpo = cliente.get(RUTA).json()

    assert cuerpo["por_medio_pago"] == []
    assert cuerpo["total_cobrado"] == "0.00"


# K04
def test_caja_del_dia_incluye_un_medio_dado_de_baja(
    cliente: TestClient, fabrica_medio_pago: FabricaMedioPago, fabrica_cobro: FabricaCobro
) -> None:
    medio = fabrica_medio_pago("Cheque", eliminado=True)
    fabrica_cobro(medio.id, "300.00")

    cuerpo = cliente.get(RUTA).json()

    assert [m["nombre"] for m in cuerpo["por_medio_pago"]] == ["Cheque"]
    assert cuerpo["total_cobrado"] == "300.00"


# K05
def test_caja_del_dia_sin_cobros_responde_200_con_lista_vacia_y_cero(
    cliente: TestClient, fabrica_medio_pago: FabricaMedioPago
) -> None:
    fabrica_medio_pago()

    respuesta = cliente.get(RUTA)

    assert respuesta.status_code == 200
    assert respuesta.json()["por_medio_pago"] == []
    assert respuesta.json()["total_cobrado"] == "0.00"


# K06
def test_caja_del_dia_con_la_base_vacia_responde_todo_en_cero(cliente: TestClient) -> None:
    respuesta = cliente.get(RUTA)

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["total_cobrado"] == "0.00"
    assert cuerpo["adeudado"] == {"cantidad_facturas": 0, "monto": "0.00"}


# K07
def test_caja_del_dia_suma_las_facturas_adeudadas(
    cliente: TestClient, fabrica_factura: FabricaFactura
) -> None:
    fabrica_factura("300.00", EstadoFactura.ADEUDADA)
    fabrica_factura("200.50", EstadoFactura.ADEUDADA)
    fabrica_factura("0.00", EstadoFactura.PAGADA)

    adeudado = cliente.get(RUTA).json()["adeudado"]

    assert adeudado == {"cantidad_facturas": 2, "monto": "500.50"}


# K08
def test_caja_del_dia_cuenta_una_factura_adeudada_de_hace_dias(
    cliente: TestClient, db: Session, fabrica_factura: FabricaFactura
) -> None:
    factura = fabrica_factura("90.00", EstadoFactura.ADEUDADA)
    factura.fecha_emision = datetime(2026, 10, 1, 12, 0, tzinfo=UTC)
    db.commit()

    assert cliente.get(RUTA).json()["adeudado"] == {"cantidad_facturas": 1, "monto": "90.00"}


# K09
def test_caja_del_dia_con_pago_parcial_suma_el_cobro_y_el_saldo(
    cliente: TestClient,
    db: Session,
    fabrica_medio_pago: FabricaMedioPago,
    fabrica_factura: FabricaFactura,
) -> None:
    medio = fabrica_medio_pago()
    factura = fabrica_factura("100.00", EstadoFactura.ADEUDADA, total="400.00")
    db.add(
        Cobro(
            factura_id=factura.id,
            medio_pago_id=medio.id,
            monto=Decimal("300.00"),
            fecha_hora=HOY_A_LAS_10,
        )
    )
    db.commit()

    cuerpo = cliente.get(RUTA).json()

    assert cuerpo["total_cobrado"] == "300.00"
    assert cuerpo["adeudado"] == {"cantidad_facturas": 1, "monto": "100.00"}


# K10
def test_caja_del_dia_ante_una_falla_de_la_base_responde_detalle_sin_trazas(
    cliente: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def falla(*_args: object, **_kwargs: object) -> None:
        raise RuntimeError("secreto interno: tabla cobros")

    monkeypatch.setattr(repository, "sumar_cobros_por_medio", falla)
    sin_relanzar = TestClient(app, raise_server_exceptions=False)

    respuesta = sin_relanzar.get(RUTA)

    assert respuesta.status_code == 500
    assert set(respuesta.json()) == {"detalle"}
    assert "secreto" not in respuesta.text
    assert "Traceback" not in respuesta.text


# K11
def test_caja_del_dia_es_de_solo_lectura(
    cliente: TestClient,
    db: Session,
    fabrica_medio_pago: FabricaMedioPago,
    fabrica_cobro: FabricaCobro,
) -> None:
    fabrica_cobro(fabrica_medio_pago().id, "50.00")

    primera = cliente.get(RUTA).json()
    segunda = cliente.get(RUTA).json()

    assert primera == segunda
    assert db.query(Cobro).count() == 1
    assert db.query(Factura).count() == 1
