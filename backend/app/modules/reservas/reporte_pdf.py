"""reservas: composición del PDF del reporte de reservas y ausentismo (HU-M5-07). No dibuja nada."""

from datetime import datetime
from decimal import Decimal

from app.modules.reservas.schemas import ResumenReservas
from app.shared.pdf import DocumentoPdf, TablaPdf

TITULO = "Reservas y ausentismo por período"
SIN_DATOS = "No hay datos para el período seleccionado."
_TITULO_TABLA = "Resumen del período"
_COLUMNAS = ["Dato", "Cantidad"]
_ANCHOS = (3, 1)
_EXPLICACION = (
    "El porcentaje de ausentismo es la cantidad de reservas canceladas por ausencia dividida por "
    "el total de reservas del período, por 100, redondeado a 2 decimales. El total incluye las "
    "reservas en cualquier estado, también las activas. Una reserva pertenece al período según "
    "su fecha, con las dos fechas del período incluidas."
)


def formatear_porcentaje(porcentaje: Decimal) -> str:
    """`Decimal("33.33")` → `"33,33 %"`: coma decimal, como la pantalla (Decisión 48)."""
    return f"{porcentaje:.2f}".replace(".", ",") + " %"


def _filas(resumen: ResumenReservas, porcentaje: Decimal) -> list[list[str]]:
    return [
        ["Total de reservas", str(resumen.total_reservas)],
        ["Atendidas", str(resumen.atendidas)],
        ["Canceladas anticipadamente", str(resumen.canceladas_anticipada)],
        ["Canceladas por ausencia", str(resumen.canceladas_por_ausencia)],
        ["Porcentaje de ausentismo", formatear_porcentaje(porcentaje)],
    ]


def componer(resumen: ResumenReservas, generado: datetime) -> DocumentoPdf:
    """Arma el documento con los mismos datos que el JSON; `generado` va en hora local."""
    porcentaje = resumen.porcentaje_ausentismo
    tablas = (
        []
        if porcentaje is None
        else [
            TablaPdf(
                titulo=_TITULO_TABLA,
                columnas=list(_COLUMNAS),
                filas=_filas(resumen, porcentaje),
                anchos=list(_ANCHOS),
                alinear_derecha=frozenset({1}),
            )
        ]
    )
    parrafos = [_EXPLICACION] if tablas else [_EXPLICACION, SIN_DATOS]
    return DocumentoPdf(
        titulo=TITULO,
        periodo=f"Período: {resumen.fecha_desde:%d/%m/%Y} al {resumen.fecha_hasta:%d/%m/%Y}",
        generado=generado,
        parrafos=parrafos,
        tablas=tablas,
    )
