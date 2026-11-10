"""salon: cálculo del reporte de mesas atendidas y ventas por mozo (HU-M3-13)."""

from collections import defaultdict
from collections.abc import Iterable, Sequence
from datetime import UTC, date, datetime, time, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal

from app.modules.atencion.service import VentaPorMozoMesa
from app.modules.salon.models import Mozo
from app.modules.salon.schemas import LineaReporteMozo, ReporteMesasVentasPorMozo
from app.shared.excepciones import DatosInvalidosError

# S116: UTC-3 fijo todo el año; se unificará con la zona de reservas en shared/ más adelante.
DESPLAZAMIENTO_HORAS = -3
ZONA_DEL_RESTAURANTE = timezone(timedelta(hours=DESPLAZAMIENTO_HORAS), "ART")
CENTAVO = Decimal("0.01")
CERO = Decimal("0.00")


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


def intervalo_utc(desde: date, hasta: date) -> tuple[datetime, datetime]:
    """Intervalo semiabierto en UTC: de las 00:00 locales de `desde` a las 00:00 de `hasta + 1`."""
    inicio = datetime.combine(desde, time.min, tzinfo=ZONA_DEL_RESTAURANTE).astimezone(UTC)
    try:
        fin_local = datetime.combine(hasta + timedelta(days=1), time.min)
    except OverflowError:
        return inicio, datetime.max.replace(tzinfo=UTC)
    return inicio, fin_local.replace(tzinfo=ZONA_DEL_RESTAURANTE).astimezone(UTC)


def promedio(total: Decimal, mesas: int) -> Decimal:
    """Venta promedio por mesa, en centavos; cero cuando no hay mesas."""
    if mesas == 0:
        return CERO
    return (total / mesas).quantize(CENTAVO, rounding=ROUND_HALF_UP)


def armar_lineas(
    mozos: Sequence[Mozo], ventas: Iterable[VentaPorMozoMesa]
) -> list[LineaReporteMozo]:
    """Una línea por mozo, con sus mesas distintas y ventas; los que no vendieron quedan en cero."""
    mesas: defaultdict[int, set[int]] = defaultdict(set)
    totales: defaultdict[int, Decimal] = defaultdict(lambda: CERO)
    for venta in ventas:
        if venta.mozo_id is None:
            continue
        mesas[venta.mozo_id].add(venta.mesa_id)
        totales[venta.mozo_id] += venta.total
    return [
        LineaReporteMozo(
            mozo_id=mozo.id,
            nombre=mozo.nombre,
            apellido=mozo.apellido,
            mesas_atendidas=len(mesas[mozo.id]),
            total_ventas=totales[mozo.id],
            promedio_por_mesa=promedio(totales[mozo.id], len(mesas[mozo.id])),
        )
        for mozo in mozos
    ]


def armar_reporte(
    desde: date, hasta: date, lineas: Sequence[LineaReporteMozo]
) -> ReporteMesasVentasPorMozo:
    """Agrega los totales y el promedio general sobre las líneas incluidas."""
    total_mesas = sum(linea.mesas_atendidas for linea in lineas)
    total_ventas = sum((linea.total_ventas for linea in lineas), CERO)
    return ReporteMesasVentasPorMozo(
        fecha_desde=desde,
        fecha_hasta=hasta,
        lineas=list(lineas),
        total_mesas_atendidas=total_mesas,
        total_ventas=total_ventas,
        promedio_general=promedio(total_ventas, total_mesas),
    )
