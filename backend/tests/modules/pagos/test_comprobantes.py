"""Pruebas del comprobante de pago (HU-M6-03, issue #72)."""

from datetime import UTC, datetime
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.pagos import comprobante_pdf, service
from app.modules.pagos.models import Cobro, Factura, TipoMedioPago
from app.modules.pagos.schemas import ComprobanteSalida, MedioPagoDelComprobante
from tests.modules.pagos.conftest import FabricaComanda, FabricaMedioPago

RUTA = "/api/v1/comprobantes"
RUTA_FACTURAS = "/api/v1/facturas"
TOTAL = "7101.00"


def _facturar(
    cliente: TestClient, comanda_id: int, medio_pago_id: int, monto: str = TOTAL
) -> dict[str, object]:
    cuerpo = {"comanda_id": comanda_id, "cobro": {"medio_pago_id": medio_pago_id, "monto": monto}}
    respuesta = cliente.post(RUTA_FACTURAS, json=cuerpo)
    assert respuesta.status_code == 201
    return respuesta.json()


def _cobrar(
    cliente: TestClient, factura_id: int, medio_pago_id: int, monto: str
) -> dict[str, object]:
    respuesta = cliente.post(
        f"{RUTA_FACTURAS}/{factura_id}/cobros",
        json={"medio_pago_id": medio_pago_id, "monto": monto},
    )
    assert respuesta.status_code == 201
    return respuesta.json()


def _contar(db: Session) -> tuple[int, int]:
    return db.query(Factura).count(), db.query(Cobro).count()


# --- CA1: datos del propio cobro ---


def test_obtener_comprobante_muestra_numero_fecha_importe_y_medio(
    cliente: TestClient, fabrica_comanda: FabricaComanda, fabrica_medio_pago: FabricaMedioPago
) -> None:
    medio = fabrica_medio_pago(nombre="Tarjeta Visa", tipo=TipoMedioPago.TARJETA)
    factura = _facturar(cliente, fabrica_comanda(), medio.id)
    [cobro] = factura["cobros"]

    respuesta = cliente.get(f"{RUTA}/{cobro['numero_comprobante']}")

    cuerpo = respuesta.json()
    assert respuesta.status_code == 200
    assert cuerpo["numero_comprobante"] == cobro["numero_comprobante"]
    assert cuerpo["fecha_hora"] == cobro["fecha_hora"]
    assert cuerpo["monto"] == TOTAL
    assert cuerpo["medio_pago"] == {"id": medio.id, "nombre": "Tarjeta Visa", "tipo": "TARJETA"}


def test_obtener_comprobante_de_un_segundo_cobro_muestra_solo_ese_cobro(
    cliente: TestClient, fabrica_comanda: FabricaComanda, fabrica_medio_pago: FabricaMedioPago
) -> None:
    efectivo = fabrica_medio_pago(nombre="Efectivo")
    tarjeta = fabrica_medio_pago(nombre="Tarjeta", tipo=TipoMedioPago.TARJETA)
    factura = _facturar(cliente, fabrica_comanda(), efectivo.id, monto="5000.00")
    actualizada = _cobrar(cliente, factura["id"], tarjeta.id, "2101.00")
    segundo = actualizada["cobros"][1]

    cuerpo = cliente.get(f"{RUTA}/{segundo['numero_comprobante']}").json()

    assert cuerpo["monto"] == "2101.00"
    assert cuerpo["medio_pago"]["id"] == tarjeta.id
    assert cuerpo["total_factura"] == TOTAL
    assert cuerpo["saldo_pendiente"] == "0.00"


# --- CA2: asociado al cobro y, por la factura, a la comanda ---


def test_obtener_comprobante_queda_asociado_al_cobro_la_factura_y_la_comanda(
    cliente: TestClient, fabrica_comanda: FabricaComanda, fabrica_medio_pago: FabricaMedioPago
) -> None:
    comanda_id = fabrica_comanda()
    factura = _facturar(cliente, comanda_id, fabrica_medio_pago().id)
    [cobro] = factura["cobros"]

    cuerpo = cliente.get(f"{RUTA}/{cobro['numero_comprobante']}").json()

    assert cuerpo["cobro_id"] == cobro["id"]
    assert cuerpo["factura_id"] == factura["id"]
    assert cuerpo["comanda_id"] == comanda_id


def test_obtener_comprobante_de_facturas_distintas_se_asocia_a_cada_una(
    cliente: TestClient, fabrica_comanda: FabricaComanda, fabrica_medio_pago: FabricaMedioPago
) -> None:
    medio = fabrica_medio_pago()
    primera_comanda, segunda_comanda = fabrica_comanda(), fabrica_comanda()
    primera = _facturar(cliente, primera_comanda, medio.id)
    segunda = _facturar(cliente, segunda_comanda, medio.id)

    for factura, comanda_id in ((primera, primera_comanda), (segunda, segunda_comanda)):
        numero = factura["cobros"][0]["numero_comprobante"]
        cuerpo = cliente.get(f"{RUTA}/{numero}").json()
        assert cuerpo["factura_id"] == factura["id"]
        assert cuerpo["comanda_id"] == comanda_id


# --- CA3: sin pago registrado ---


def test_obtener_comprobante_inexistente_responde_404_y_no_crea_nada(
    cliente: TestClient,
    db: Session,
    fabrica_comanda: FabricaComanda,
    fabrica_medio_pago: FabricaMedioPago,
) -> None:
    _facturar(cliente, fabrica_comanda(), fabrica_medio_pago().id)
    antes = _contar(db)

    for ruta in (f"{RUTA}/999", f"{RUTA}/999/pdf"):
        respuesta = cliente.get(ruta)
        assert respuesta.status_code == 404
        assert respuesta.json() == {"detalle": "No hay un pago registrado con el comprobante 999"}
    assert _contar(db) == antes


def test_obtener_comprobante_sin_ningun_cobro_responde_404(cliente: TestClient) -> None:
    respuesta = cliente.get(f"{RUTA}/1")

    assert respuesta.status_code == 404


def test_obtener_comprobante_con_numero_no_numerico_responde_422(cliente: TestClient) -> None:
    respuesta = cliente.get(f"{RUTA}/abc")

    assert respuesta.status_code == 422
    assert "detalle" in respuesta.json()


# --- CA4: un unico comprobante por cobro ---


def test_obtener_comprobante_dos_veces_devuelve_el_mismo_y_no_crea_otro(
    cliente: TestClient,
    db: Session,
    fabrica_comanda: FabricaComanda,
    fabrica_medio_pago: FabricaMedioPago,
) -> None:
    factura = _facturar(cliente, fabrica_comanda(), fabrica_medio_pago().id)
    numero = factura["cobros"][0]["numero_comprobante"]
    antes = _contar(db)

    primero = cliente.get(f"{RUTA}/{numero}").json()
    segundo = cliente.get(f"{RUTA}/{numero}").json()

    assert primero == segundo
    assert _contar(db) == antes


def test_obtener_comprobante_json_y_pdf_llevan_el_mismo_numero(
    cliente: TestClient, fabrica_comanda: FabricaComanda, fabrica_medio_pago: FabricaMedioPago
) -> None:
    factura = _facturar(cliente, fabrica_comanda(), fabrica_medio_pago().id)
    numero = factura["cobros"][0]["numero_comprobante"]

    json = cliente.get(f"{RUTA}/{numero}").json()
    pdf = cliente.get(f"{RUTA}/{numero}/pdf")

    assert json["numero_comprobante"] == numero
    assert f'filename="comprobante-{numero}.pdf"' in pdf.headers["content-disposition"]


# --- PDF (S3) ---


def test_descargar_comprobante_pdf_devuelve_un_adjunto_pdf(
    cliente: TestClient, fabrica_comanda: FabricaComanda, fabrica_medio_pago: FabricaMedioPago
) -> None:
    factura = _facturar(cliente, fabrica_comanda(), fabrica_medio_pago().id)
    numero = factura["cobros"][0]["numero_comprobante"]

    respuesta = cliente.get(f"{RUTA}/{numero}/pdf")

    assert respuesta.status_code == 200
    assert respuesta.headers["content-type"] == "application/pdf"
    assert respuesta.headers["content-disposition"].startswith("attachment;")
    assert respuesta.content.startswith(b"%PDF")


def test_descargar_comprobante_pdf_con_acentos_y_enie_en_el_medio(
    cliente: TestClient, fabrica_comanda: FabricaComanda, fabrica_medio_pago: FabricaMedioPago
) -> None:
    medio = fabrica_medio_pago(nombre="Billetera Señal Ágil", tipo=TipoMedioPago.BILLETERA_VIRTUAL)
    factura = _facturar(cliente, fabrica_comanda(), medio.id)
    numero = factura["cobros"][0]["numero_comprobante"]

    respuesta = cliente.get(f"{RUTA}/{numero}/pdf")

    assert respuesta.status_code == 200
    assert respuesta.content.startswith(b"%PDF")


# --- S4: medio eliminado despues del cobro ---


def test_obtener_comprobante_con_medio_eliminado_conserva_su_nombre(
    cliente: TestClient,
    db: Session,
    fabrica_comanda: FabricaComanda,
    fabrica_medio_pago: FabricaMedioPago,
) -> None:
    medio = fabrica_medio_pago(nombre="Cheque")
    factura = _facturar(cliente, fabrica_comanda(), medio.id)
    numero = factura["cobros"][0]["numero_comprobante"]
    assert cliente.delete(f"/api/v1/medios-de-pago/{medio.id}").status_code == 204

    cuerpo = cliente.get(f"{RUTA}/{numero}").json()

    assert cuerpo["medio_pago"]["nombre"] == "Cheque"


# --- Service y documento PDF ---


def test_generar_pdf_comprobante_nombra_el_archivo_con_el_numero(
    db: Session,
    cliente: TestClient,
    fabrica_comanda: FabricaComanda,
    fabrica_medio_pago: FabricaMedioPago,
) -> None:
    factura = _facturar(cliente, fabrica_comanda(), fabrica_medio_pago().id)
    numero = factura["cobros"][0]["numero_comprobante"]

    archivo = service.generar_pdf_comprobante(db, numero)

    assert archivo.nombre == f"comprobante-{numero}.pdf"
    assert archivo.contenido.startswith(b"%PDF")


def _comprobante() -> ComprobanteSalida:
    return ComprobanteSalida(
        numero_comprobante=12,
        fecha_hora=datetime(2026, 11, 6, 23, 30, tzinfo=UTC),
        monto=Decimal("2500.00"),
        medio_pago=MedioPagoDelComprobante(id=3, nombre="Efectivo", tipo=TipoMedioPago.EFECTIVO),
        cobro_id=12,
        factura_id=5,
        comanda_id=8,
        total_factura=Decimal("7101.00"),
        saldo_pendiente=Decimal("4601.00"),
    )


def test_componer_comprobante_lleva_numero_factura_comanda_y_datos_del_cobro() -> None:
    documento = comprobante_pdf.componer(_comprobante(), datetime(2026, 11, 7, 10, 0))

    assert documento.titulo == "Comprobante de pago N° 12"
    assert documento.periodo == "Factura #5 · Comanda #8"
    resumen = dict(documento.resumen)
    assert resumen["Fecha"] == "06/11/2026 20:30"  # hora del restaurante (UTC-3, S5)
    assert resumen["Medio de pago"] == "Efectivo"
    assert resumen["Importe pagado"] == "$ 2500.00"
    assert resumen["Total de la factura"] == "$ 7101.00"
    assert resumen["Saldo pendiente"] == "$ 4601.00"
