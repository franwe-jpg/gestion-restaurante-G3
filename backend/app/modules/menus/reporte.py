"""menus: cálculo puro del reporte de impacto de promociones (HU-M2-10)."""

from collections import defaultdict
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal

from app.modules.atencion.service import VentaProductoFecha
from app.modules.menus.models import DiaSemana, Promocion
from app.modules.menus.schemas import (
    LineaImpactoPromocion,
    PromocionReporte,
    ReporteImpactoPromociones,
    UnidadPromedio,
)
from app.shared.excepciones import DatosInvalidosError
from app.shared.models import Producto

# UTC-3 fijo todo el año, igual que los demás reportes de la cátedra.
DESPLAZAMIENTO_HORAS = -3
ZONA_DEL_RESTAURANTE = timezone(timedelta(hours=DESPLAZAMIENTO_HORAS), "ART")
CENTAVO = Decimal("0.01")
CERO = Decimal("0.00")
HORAS_POR_DIA = Decimal("24")
# Sin una base mínima, el porcentaje crece sin sentido (por ejemplo, +3536 %).
BASE_MINIMA_DIA = Decimal("1.00")
BASE_MINIMA_HORA = Decimal("0.10")


def validar_periodo(desde: date | None, hasta: date | None) -> tuple[date, date]:
    """Exige ambas fechas y que el período no sea inverso; devuelve las fechas válidas."""
    if desde is None and hasta is None:
        raise DatosInvalidosError("Faltan la fecha desde y la fecha hasta.")
    if desde is None:
        raise DatosInvalidosError("Falta la fecha desde.")
    if hasta is None:
        raise DatosInvalidosError("Falta la fecha hasta.")
    if desde > hasta:
        raise DatosInvalidosError(
            "El período es inválido: la fecha desde es posterior a la fecha hasta."
        )
    return desde, hasta


def validar_promocion(promocion_id: int | None) -> int:
    """Exige la promoción que se quiere evaluar."""
    if promocion_id is None:
        raise DatosInvalidosError("Falta la promoción.")
    return promocion_id


def intervalo_utc(desde: date, hasta: date) -> tuple[datetime, datetime]:
    """Intervalo semiabierto en UTC: de las 00:00 locales de `desde` a las 00:00 de `hasta + 1`."""
    inicio = datetime.combine(desde, time.min, tzinfo=ZONA_DEL_RESTAURANTE).astimezone(UTC)
    try:
        fin_local = datetime.combine(hasta + timedelta(days=1), time.min)
    except OverflowError:
        return inicio, datetime.max.replace(tzinfo=UTC)
    return inicio, fin_local.replace(tzinfo=ZONA_DEL_RESTAURANTE).astimezone(UTC)


def dias_del_periodo(desde: date, hasta: date) -> int:
    """Cantidad de días calendario incluidos entre ambas fechas."""
    return (hasta - desde).days + 1


def dias_programados(promocion: Promocion, desde: date, hasta: date) -> list[date]:
    """Fechas del período en las que la promoción está programada por fecha y día."""
    inicio = max(desde, promocion.fecha_desde)
    fin = min(hasta, promocion.fecha_hasta)
    dias = {DiaSemana(dia) for dia in promocion.dias_semana}
    fechas: list[date] = []
    fecha = inicio
    while fecha <= fin:
        if list(DiaSemana)[fecha.weekday()] in dias:
            fechas.append(fecha)
        fecha += timedelta(days=1)
    return fechas


def horas_por_dia(promocion: Promocion) -> Decimal | None:
    """Duración diaria de la franja, o `None` si la promoción aplica todo el día."""
    if promocion.hora_desde is None or promocion.hora_hasta is None:
        return None
    inicio = datetime.combine(date.min, promocion.hora_desde)
    fin = datetime.combine(date.min, promocion.hora_hasta)
    horas = Decimal(str((fin - inicio).total_seconds())) / Decimal(3600)
    return horas.quantize(CENTAVO, rounding=ROUND_HALF_UP)


@dataclass(frozen=True)
class Exposicion:
    """Días y horas de exposición de la promoción dentro del período."""

    dias_promocion: int
    dias_fuera: int
    unidad: UnidadPromedio
    durante: Decimal
    fuera: Decimal
    horas_por_dia: Decimal | None


def calcular_exposicion(promocion: Promocion, desde: date, hasta: date) -> Exposicion:
    """Base de comparación: días programados o horas programadas según la franja."""
    dias_promocion = len(dias_programados(promocion, desde, hasta))
    dias_totales = dias_del_periodo(desde, hasta)
    dias_fuera = max(dias_totales - dias_promocion, 0)
    horas = horas_por_dia(promocion)
    if horas is None:
        return Exposicion(
            dias_promocion=dias_promocion,
            dias_fuera=dias_fuera,
            unidad=UnidadPromedio.DIA,
            durante=Decimal(dias_promocion),
            fuera=Decimal(dias_fuera),
            horas_por_dia=None,
        )
    durante = Decimal(dias_promocion) * horas
    fuera = max(Decimal(dias_totales) * HORAS_POR_DIA - durante, CERO)
    return Exposicion(
        dias_promocion=dias_promocion,
        dias_fuera=dias_fuera,
        unidad=UnidadPromedio.HORA,
        durante=durante,
        fuera=fuera,
        horas_por_dia=horas,
    )


def _promedio(cantidad: int, exposicion: Decimal) -> Decimal | None:
    """Unidades por día u hora; sin exposición no hay promedio comparable."""
    if exposicion <= CERO:
        return None
    return (Decimal(cantidad) / exposicion).quantize(CENTAVO, rounding=ROUND_HALF_UP)


def _variacion(
    durante: Decimal | None, fuera: Decimal | None, unidad: UnidadPromedio
) -> Decimal | None:
    """Variación porcentual solo con una base fuera que no sea insignificante."""
    if durante is None or fuera is None:
        return None
    base_minima = BASE_MINIMA_DIA if unidad == UnidadPromedio.DIA else BASE_MINIMA_HORA
    if fuera < base_minima:
        return None
    variacion = (durante - fuera) * 100 / fuera
    return variacion.quantize(CENTAVO, rounding=ROUND_HALF_UP)


def _acumular(
    ventas: Iterable[VentaProductoFecha],
) -> tuple[defaultdict[int, int], defaultdict[int, int], defaultdict[int, set[date]]]:
    cantidad_durante: defaultdict[int, int] = defaultdict(int)
    cantidad_fuera: defaultdict[int, int] = defaultdict(int)
    dias_con_ventas: defaultdict[int, set[date]] = defaultdict(set)
    for venta in ventas:
        if venta.es_promocion:
            cantidad_durante[venta.producto_id] += venta.cantidad
            dias_con_ventas[venta.producto_id].add(venta.fecha)
        else:
            cantidad_fuera[venta.producto_id] += venta.cantidad
    return cantidad_durante, cantidad_fuera, dias_con_ventas


def _diferencia(promedio_durante: Decimal | None, promedio_fuera: Decimal | None) -> Decimal | None:
    """Diferencia absoluta entre promedios; sin ambos valores no se puede calcular."""
    if promedio_durante is None or promedio_fuera is None:
        return None
    return (promedio_durante - promedio_fuera).quantize(CENTAVO, rounding=ROUND_HALF_UP)


def _linea(
    producto: Producto,
    cantidad_durante: int,
    cantidad_fuera: int,
    dias_con_ventas: int,
    exposicion: Exposicion,
) -> LineaImpactoPromocion:
    promedio_durante = _promedio(cantidad_durante, exposicion.durante)
    promedio_fuera = _promedio(cantidad_fuera, exposicion.fuera)
    diferencia = _diferencia(promedio_durante, promedio_fuera)
    impacto = (
        None
        if diferencia is None
        else (diferencia * exposicion.durante).quantize(CENTAVO, rounding=ROUND_HALF_UP)
    )
    return LineaImpactoPromocion(
        producto_id=producto.id,
        nombre=producto.nombre,
        estado=producto.estado,
        promedio_durante=promedio_durante,
        promedio_fuera=promedio_fuera,
        diferencia_promedio=diferencia,
        impacto_estimado=impacto,
        variacion_porcentual=_variacion(promedio_durante, promedio_fuera, exposicion.unidad),
        cantidad_durante=cantidad_durante,
        cantidad_fuera=cantidad_fuera,
        dias_con_ventas_promocion=dias_con_ventas,
    )


def armar_reporte(
    promocion: Promocion,
    desde: date,
    hasta: date,
    ventas: Sequence[VentaProductoFecha],
) -> ReporteImpactoPromociones:
    """Arma las líneas por producto y avisa si la promoción no tuvo ventas en el período."""
    cantidad_durante, cantidad_fuera, dias_con_ventas = _acumular(ventas)
    exposicion = calcular_exposicion(promocion, desde, hasta)
    hay_datos = exposicion.durante > CERO and any(
        cantidad_durante[producto.id] > 0 for producto in promocion.productos
    )
    lineas = [
        _linea(
            producto,
            cantidad_durante[producto.id],
            cantidad_fuera[producto.id],
            len(dias_con_ventas[producto.id]),
            exposicion,
        )
        for producto in promocion.productos
        if hay_datos and (cantidad_durante[producto.id] or cantidad_fuera[producto.id])
    ]
    lineas.sort(key=lambda linea: (linea.nombre.casefold(), linea.producto_id))
    return ReporteImpactoPromociones(
        promocion=PromocionReporte(
            id=promocion.id,
            nombre=promocion.nombre,
            estado=promocion.estado,
            fecha_desde=promocion.fecha_desde,
            fecha_hasta=promocion.fecha_hasta,
            hora_desde=promocion.hora_desde,
            hora_hasta=promocion.hora_hasta,
        ),
        fecha_desde=desde,
        fecha_hasta=hasta,
        dias_promocion=exposicion.dias_promocion,
        dias_fuera=exposicion.dias_fuera,
        horas_promocion_por_dia=exposicion.horas_por_dia,
        unidad_promedio=exposicion.unidad,
        hay_datos=hay_datos,
        lineas=lineas,
    )
