"""pagos: composición del PDF del reporte de recaudación (HU-M6-08). No dibuja nada."""

from datetime import datetime
from decimal import Decimal

from app.modules.pagos.schemas import ResumenRecaudacion
from app.shared.pdf import DocumentoPdf, TablaPdf

TITULO = "Recaudación por medio de pago"
SIN_DATOS = "No hay datos para el período seleccionado."
SIN_COBROS = "Sin cobros en el período."
_TITULO_TABLA = "Cobrado por medio de pago"
_COLUMNAS = ["Medio de pago", "Tipo", "Cobros", "Monto"]
_ANCHOS = [3.0, 2.0, 1.0, 2.0]
_EXPLICACION = (
    "Lo cobrado suma los cobros registrados desde las 00:00 de la fecha desde hasta las 24:00 "
    "de la fecha hasta (hora del restaurante), agrupados por medio de pago, incluidos los "
    "medios dados de baja. Lo adeudado suma el saldo pendiente actual de las facturas emitidas "
    "en el período que todavía no están pagadas: si una factura se cobra después, deja de "
    "figurar como adeudada."
)
_TIPOS = {
    "EFECTIVO": "Efectivo",
    "TARJETA": "Tarjeta",
    "TRANSFERENCIA": "Transferencia",
    "BILLETERA_VIRTUAL": "Billetera virtual",
}


def formatear_importe(valor: Decimal) -> str:
    """`Decimal("1234.5")` → `"$ 1.234,50"`: miles con punto y decimales con coma (S6)."""
    texto = f"{valor:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")
    return f"$ {texto}"


def _resumen(resumen: ResumenRecaudacion) -> list[tuple[str, str]]:
    return [
        ("Total cobrado", formatear_importe(resumen.total_cobrado)),
        ("Total adeudado", formatear_importe(resumen.adeudado.monto)),
        ("Facturas adeudadas", str(resumen.adeudado.cantidad_facturas)),
    ]


def _parrafos(resumen: ResumenRecaudacion, hay_deuda: bool) -> list[str]:
    if resumen.por_medio_pago:
        return [_EXPLICACION]
    return [_EXPLICACION, SIN_COBROS if hay_deuda else SIN_DATOS]


def _tablas(resumen: ResumenRecaudacion) -> list[TablaPdf]:
    if not resumen.por_medio_pago:
        return []
    filas = [
        [
            medio.nombre,
            _TIPOS[medio.tipo.value],
            str(medio.cantidad_cobros),
            formatear_importe(medio.monto),
        ]
        for medio in resumen.por_medio_pago
    ]
    cobros = sum(medio.cantidad_cobros for medio in resumen.por_medio_pago)
    filas.append(["Total", "", str(cobros), formatear_importe(resumen.total_cobrado)])
    return [
        TablaPdf(
            titulo=_TITULO_TABLA,
            columnas=list(_COLUMNAS),
            filas=filas,
            anchos=list(_ANCHOS),
            alinear_derecha=frozenset({2, 3}),
        )
    ]


def componer(resumen: ResumenRecaudacion, generado: datetime) -> DocumentoPdf:
    """Arma el documento con los mismos datos que el JSON; `generado` va en hora local."""
    hay_deuda = resumen.adeudado.cantidad_facturas > 0
    hay_datos = bool(resumen.por_medio_pago) or hay_deuda
    return DocumentoPdf(
        titulo=TITULO,
        periodo=f"Período: {resumen.fecha_desde:%d/%m/%Y} al {resumen.fecha_hasta:%d/%m/%Y}",
        generado=generado,
        parrafos=_parrafos(resumen, hay_deuda),
        tablas=_tablas(resumen),
        resumen=_resumen(resumen) if hay_datos else [],
    )
