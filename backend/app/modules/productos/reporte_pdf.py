"""productos: composición del PDF del reporte de más vendidos (HU-M1-15). No dibuja nada."""

from datetime import datetime

from app.modules.productos.schemas import (
    DiaSemana,
    FranjaHoraria,
    LineaReporteProductos,
    ReporteProductosMasVendidos,
)
from app.shared.models import Estado
from app.shared.pdf import DocumentoPdf, TablaPdf

TITULO = "Productos más vendidos por período"
SIN_DATOS = "No hay datos para el período elegido."
_COLUMNAS = ["Producto", "Cantidad pedida", "Días más pedidos", "Franjas más pedidas"]
_ANCHOS = (2.8, 1.6, 2, 2.4)
_EXPLICACION = (
    "La cantidad pedida es la suma de las cantidades de las líneas de producto de las comandas "
    "del período. El día de la semana y la franja horaria se calculan en hora local UTC-3. No "
    "cuentan las comandas anuladas ni los menús ejecutivos. En caso de empate se muestran "
    "todos los empatados."
)
_NOMBRES_DIAS = {
    DiaSemana.LUNES: "Lunes",
    DiaSemana.MARTES: "Martes",
    DiaSemana.MIERCOLES: "Miércoles",
    DiaSemana.JUEVES: "Jueves",
    DiaSemana.VIERNES: "Viernes",
    DiaSemana.SABADO: "Sábado",
    DiaSemana.DOMINGO: "Domingo",
}


def _texto_de_franja(franja: FranjaHoraria) -> str:
    return f"{franja.hora_desde:02d}:00 a {franja.hora_hasta:02d}:00"


def _fila(linea: LineaReporteProductos) -> list[str]:
    nombre = linea.nombre
    if linea.estado == Estado.DESHABILITADO:
        nombre += " (Deshabilitado)"
    return [
        nombre,
        str(linea.cantidad_pedida),
        ", ".join(_NOMBRES_DIAS[dia] for dia in linea.dias_mas_pedidos),
        ", ".join(_texto_de_franja(franja) for franja in linea.franjas_mas_pedidas),
    ]


def _resumen(reporte: ReporteProductosMasVendidos) -> list[tuple[str, str]]:
    lineas = [linea for seccion in reporte.secciones for linea in seccion.productos]
    if not lineas:
        return []
    mas_vendido = min(lineas, key=lambda x: (-x.cantidad_pedida, x.nombre, x.producto_id))
    return [
        ("Unidades pedidas", str(sum(linea.cantidad_pedida for linea in lineas))),
        ("Productos distintos", str(len(lineas))),
        ("Más vendido", mas_vendido.nombre),
    ]


def componer(reporte: ReporteProductosMasVendidos, generado: datetime) -> DocumentoPdf:
    """Arma el documento con los mismos datos que el JSON; `generado` va en hora local."""
    tablas = [
        TablaPdf(
            titulo=seccion.nombre,
            columnas=list(_COLUMNAS),
            filas=[_fila(linea) for linea in seccion.productos],
            anchos=list(_ANCHOS),
            alinear_derecha=frozenset({1}),
        )
        for seccion in reporte.secciones
    ]
    parrafos = [_EXPLICACION] if tablas else [_EXPLICACION, SIN_DATOS]
    return DocumentoPdf(
        titulo=TITULO,
        periodo=f"Período: {reporte.fecha_desde:%d/%m/%Y} al {reporte.fecha_hasta:%d/%m/%Y}",
        generado=generado,
        parrafos=parrafos,
        tablas=tablas,
        resumen=_resumen(reporte),
    )
