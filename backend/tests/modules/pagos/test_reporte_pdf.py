"""Pruebas de la composición del PDF del reporte de recaudación (HU-M6-08)."""

from datetime import date, datetime
from decimal import Decimal

from app.modules.pagos import reporte_pdf
from app.modules.pagos.models import TipoMedioPago
from app.modules.pagos.schemas import AdeudadoSalida, CobradoPorMedio, ResumenRecaudacion

GENERADO = datetime(2026, 11, 2, 12, 0)


def _medio(medio_pago_id: int, nombre: str, tipo: TipoMedioPago, monto: str) -> CobradoPorMedio:
    return CobradoPorMedio(
        medio_pago_id=medio_pago_id,
        nombre=nombre,
        tipo=tipo,
        cantidad_cobros=2,
        monto=Decimal(monto),
    )


def _resumen(**cambios: object) -> ResumenRecaudacion:
    base: dict[str, object] = {
        "fecha_desde": date(2026, 10, 1),
        "fecha_hasta": date(2026, 10, 31),
        "por_medio_pago": [
            _medio(1, "Efectivo", TipoMedioPago.EFECTIVO, "1500.00"),
            _medio(2, "Mercado Pago", TipoMedioPago.BILLETERA_VIRTUAL, "2000.00"),
        ],
        "total_cobrado": Decimal("3500.00"),
        "adeudado": AdeudadoSalida(cantidad_facturas=2, monto=Decimal("500.50")),
    }
    return ResumenRecaudacion(**(base | cambios))


def _sin_cobros(**cambios: object) -> ResumenRecaudacion:
    return _resumen(por_medio_pago=[], total_cobrado=Decimal("0.00"), **cambios)


def test_componer_arma_titulo_periodo_y_fecha_de_generacion() -> None:
    documento = reporte_pdf.componer(_resumen(), GENERADO)

    assert documento.titulo == "Recaudación por medio de pago"
    assert documento.periodo == "Período: 01/10/2026 al 31/10/2026"
    assert documento.generado == GENERADO


def test_componer_con_datos_arma_el_recuadro_y_la_tabla_con_total() -> None:
    documento = reporte_pdf.componer(_resumen(), GENERADO)

    assert documento.resumen == [
        ("Total cobrado", "$ 3.500,00"),
        ("Total adeudado", "$ 500,50"),
        ("Facturas adeudadas", "2"),
    ]
    assert len(documento.tablas) == 1
    tabla = documento.tablas[0]
    assert tabla.titulo == "Cobrado por medio de pago"
    assert tabla.columnas == ["Medio de pago", "Tipo", "Cobros", "Monto"]
    assert tabla.filas == [
        ["Efectivo", "Efectivo", "2", "$ 1.500,00"],
        ["Mercado Pago", "Billetera virtual", "2", "$ 2.000,00"],
        ["Total", "", "4", "$ 3.500,00"],
    ]
    assert reporte_pdf.SIN_COBROS not in documento.parrafos
    assert len(documento.parrafos) == 1
    assert "saldo pendiente actual" in documento.parrafos[0]


def test_componer_solo_con_deuda_no_arma_tabla_y_avisa_que_no_hay_cobros() -> None:
    documento = reporte_pdf.componer(_sin_cobros(), GENERADO)

    assert documento.tablas == []
    assert reporte_pdf.SIN_COBROS in documento.parrafos
    assert len(documento.resumen) == 3


def test_componer_sin_datos_no_arma_tabla_ni_recuadro_e_informa_que_no_hay_datos() -> None:
    sin_deuda = AdeudadoSalida(cantidad_facturas=0, monto=Decimal("0.00"))

    documento = reporte_pdf.componer(_sin_cobros(adeudado=sin_deuda), GENERADO)

    assert documento.tablas == []
    assert documento.resumen == []
    assert reporte_pdf.SIN_DATOS in documento.parrafos
    assert reporte_pdf.SIN_DATOS == "No hay datos para el período seleccionado."


def test_formatear_importe_usa_miles_con_punto_y_decimales_con_coma() -> None:
    assert reporte_pdf.formatear_importe(Decimal("1234.5")) == "$ 1.234,50"
    assert reporte_pdf.formatear_importe(Decimal("0")) == "$ 0,00"
