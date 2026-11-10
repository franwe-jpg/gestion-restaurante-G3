"""Pruebas de la composición del PDF del reporte de reservas y ausentismo (HU-M5-07)."""

from datetime import date, datetime
from decimal import Decimal

from app.modules.reservas import reporte_pdf
from app.modules.reservas.schemas import ResumenReservas

GENERADO = datetime(2026, 11, 2, 12, 0)


def _resumen(**cambios: object) -> ResumenReservas:
    base = {
        "fecha_desde": date(2026, 10, 1),
        "fecha_hasta": date(2026, 10, 31),
        "total_reservas": 6,
        "atendidas": 1,
        "canceladas_anticipada": 2,
        "canceladas_por_ausencia": 1,
        "porcentaje_ausentismo": Decimal("16.67"),
    }
    return ResumenReservas(**(base | cambios))


def test_componer_arma_titulo_periodo_y_fecha_de_generacion() -> None:
    documento = reporte_pdf.componer(_resumen(), GENERADO)

    assert documento.titulo == "Reservas y ausentismo por período"
    assert documento.periodo == "Período: 01/10/2026 al 31/10/2026"
    assert documento.generado == GENERADO


def test_componer_con_datos_arma_una_tabla_con_las_cinco_filas() -> None:
    documento = reporte_pdf.componer(_resumen(), GENERADO)

    assert len(documento.tablas) == 1
    assert documento.tablas[0].titulo == "Resumen del período"
    assert documento.tablas[0].filas == [
        ["Total de reservas", "6"],
        ["Atendidas", "1"],
        ["Canceladas anticipadamente", "2"],
        ["Canceladas por ausencia", "1"],
        ["Porcentaje de ausentismo", "16,67 %"],
    ]


def test_componer_sin_datos_no_arma_tablas_y_el_parrafo_informa_que_no_hay_datos() -> None:
    resumen = _resumen(
        total_reservas=0,
        atendidas=0,
        canceladas_anticipada=0,
        canceladas_por_ausencia=0,
        porcentaje_ausentismo=None,
    )

    documento = reporte_pdf.componer(resumen, GENERADO)

    assert documento.tablas == []
    assert reporte_pdf.SIN_DATOS in documento.parrafos
    assert "%" not in " ".join(documento.parrafos)


def test_formatear_porcentaje_usa_coma_decimal_y_sufijo() -> None:
    assert reporte_pdf.formatear_porcentaje(Decimal("33.33")) == "33,33 %"
