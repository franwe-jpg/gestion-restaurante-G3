"""reservas: cálculo puro del reporte de reservas y ausentismo (HU-M5-07), sin base de datos."""

from collections.abc import Mapping
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from app.modules.reservas.models import EstadoReserva
from app.modules.reservas.schemas import ResumenReservas
from app.shared.excepciones import DatosInvalidosError

_DOS_DECIMALES = Decimal("0.01")


def validar_periodo(desde: date | None, hasta: date | None) -> tuple[date, date]:
    """Exige ambas fechas y que el período no sea inverso; devuelve las fechas válidas (S4)."""
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


def calcular_porcentaje_ausentismo(canceladas_por_ausencia: int, total: int) -> Decimal | None:
    """`canceladas_por_ausencia / total * 100` con 2 decimales `ROUND_HALF_UP`; `None` sin reservas
    (S1, S3)."""
    if total == 0:
        return None
    porcentaje = Decimal(canceladas_por_ausencia) * 100 / Decimal(total)
    return porcentaje.quantize(_DOS_DECIMALES, rounding=ROUND_HALF_UP)


def armar_resumen(
    desde: date, hasta: date, conteos: Mapping[EstadoReserva, int]
) -> ResumenReservas:
    """Completa con 0 los estados ausentes y calcula el porcentaje sobre el total del período."""
    total = sum(conteos.values())
    por_ausencia = conteos.get(EstadoReserva.CANCELADA_POR_AUSENCIA, 0)
    return ResumenReservas(
        fecha_desde=desde,
        fecha_hasta=hasta,
        total_reservas=total,
        atendidas=conteos.get(EstadoReserva.ATENDIDA, 0),
        canceladas_anticipada=conteos.get(EstadoReserva.CANCELADA_ANTICIPADA, 0),
        canceladas_por_ausencia=por_ausencia,
        porcentaje_ausentismo=calcular_porcentaje_ausentismo(por_ausencia, total),
    )
