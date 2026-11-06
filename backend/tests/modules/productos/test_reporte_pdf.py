"""Composición del PDF del reporte de productos más vendidos (HU-M1-15), sin dibujar."""

from datetime import date, datetime

from app.modules.productos import reporte_pdf
from app.modules.productos.schemas import (
    DiaSemana,
    FranjaHoraria,
    LineaReporteProductos,
    ReporteProductosMasVendidos,
    SeccionReporte,
)
from app.shared.models import Estado

GENERADO = datetime(2026, 11, 6, 10, 30)


def _linea(nombre: str = "Pizza", estado: Estado = Estado.HABILITADO) -> LineaReporteProductos:
    return LineaReporteProductos(
        producto_id=1,
        nombre=nombre,
        estado=estado,
        cantidad_pedida=8,
        dias_mas_pedidos=[DiaSemana.VIERNES, DiaSemana.SABADO],
        franjas_mas_pedidas=[
            FranjaHoraria(hora_desde=13, hora_hasta=14),
            FranjaHoraria(hora_desde=21, hora_hasta=22),
        ],
    )


def _reporte(secciones: list[SeccionReporte]) -> ReporteProductosMasVendidos:
    return ReporteProductosMasVendidos(
        fecha_desde=date(2026, 11, 1), fecha_hasta=date(2026, 11, 5), secciones=secciones
    )


def _con_datos() -> ReporteProductosMasVendidos:
    return _reporte(
        [
            SeccionReporte(id=1, nombre="Platos", orden=1, productos=[_linea()]),
            SeccionReporte(
                id=2,
                nombre="Postres",
                orden=2,
                productos=[_linea("Flan", Estado.DESHABILITADO), _linea("Helado")],
            ),
        ]
    )


def test_componer_arma_titulo_periodo_y_fecha_de_generacion() -> None:
    documento = reporte_pdf.componer(_con_datos(), GENERADO)

    assert documento.titulo == "Productos más vendidos por período"
    assert documento.periodo == "Período: 01/11/2026 al 05/11/2026"
    assert documento.generado == GENERADO


def test_componer_explica_el_calculo() -> None:
    texto = " ".join(reporte_pdf.componer(_con_datos(), GENERADO).parrafos)

    assert "UTC-3" in texto
    assert "anuladas" in texto
    assert "menús ejecutivos" in texto
    assert "empate" in texto


def test_componer_arma_una_tabla_por_seccion_con_una_fila_por_producto() -> None:
    documento = reporte_pdf.componer(_con_datos(), GENERADO)

    assert [t.titulo for t in documento.tablas] == ["Platos", "Postres"]
    assert documento.tablas[0].columnas == [
        "Producto",
        "Cantidad pedida",
        "Días más pedidos",
        "Franjas más pedidas",
    ]
    assert [fila[0] for fila in documento.tablas[1].filas] == ["Flan (Deshabilitado)", "Helado"]


def test_componer_muestra_dias_y_franjas_empatados_separados_por_coma() -> None:
    fila = reporte_pdf.componer(_con_datos(), GENERADO).tablas[0].filas[0]

    assert fila == ["Pizza", "8", "Viernes, Sábado", "13:00 a 14:00, 21:00 a 22:00"]


def test_componer_muestra_la_franja_que_cruza_la_medianoche() -> None:
    linea = _linea().model_copy(
        update={"franjas_mas_pedidas": [FranjaHoraria(hora_desde=23, hora_hasta=0)]}
    )
    reporte = _reporte([SeccionReporte(id=1, nombre="Bar", orden=1, productos=[linea])])

    fila = reporte_pdf.componer(reporte, GENERADO).tablas[0].filas[0]

    assert fila[3] == "23:00 a 00:00"


def test_componer_sin_datos_informa_que_no_hay_datos_y_no_arma_tablas() -> None:
    documento = reporte_pdf.componer(_reporte([]), GENERADO)

    assert "No hay datos para el período elegido." in documento.parrafos
    assert documento.tablas == []


def test_componer_arma_el_resumen_con_total_cantidad_de_productos_y_mas_vendido() -> None:
    reporte = _reporte(
        [
            SeccionReporte(id=1, nombre="Platos", orden=1, productos=[_linea("Pizza")]),
            SeccionReporte(
                id=2,
                nombre="Postres",
                orden=2,
                productos=[
                    _linea("Flan").model_copy(update={"producto_id": 2, "cantidad_pedida": 20}),
                    _linea("Budín").model_copy(update={"producto_id": 3, "cantidad_pedida": 20}),
                ],
            ),
        ]
    )

    documento = reporte_pdf.componer(reporte, GENERADO)

    assert documento.resumen == [
        ("Unidades pedidas", "48"),
        ("Productos distintos", "3"),
        ("Más vendido", "Budín"),
    ]


def test_componer_define_anchos_y_alinea_a_la_derecha_la_cantidad() -> None:
    tabla = reporte_pdf.componer(_con_datos(), GENERADO).tablas[0]

    assert tabla.anchos == [2.8, 1.6, 2, 2.4]
    assert tabla.alinear_derecha == frozenset({1})


def test_componer_sin_datos_no_arma_resumen() -> None:
    assert reporte_pdf.componer(_reporte([]), GENERADO).resumen == []


def test_componer_con_datos_el_resumen_llega_al_pdf_renderizado() -> None:
    from app.shared.pdf import renderizar

    contenido = renderizar(reporte_pdf.componer(_con_datos(), GENERADO), comprimir=False)

    assert b"Unidades pedidas" in contenido
    assert b"01/11/2026 al 05/11/2026" in contenido
