"""Validación y cálculos del reporte de comandas por día y turno (HU-M4-11)."""

from datetime import UTC, date, datetime, time, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal
from enum import StrEnum

from app.shared.excepciones import DatosInvalidosError

ZONA_DEL_RESTAURANTE = timezone(timedelta(hours=-3), "ART")
CENTAVO = Decimal("0.01")
CERO = Decimal("0.00")


class TurnoReporte(StrEnum):
    ALMUERZO = "ALMUERZO"
    NOCHE = "NOCHE"


def validar_periodo(desde: date | None, hasta: date | None) -> tuple[date, date]:
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
    inicio = datetime.combine(desde, time.min, tzinfo=ZONA_DEL_RESTAURANTE).astimezone(UTC)
    try:
        fin_local = datetime.combine(hasta + timedelta(days=1), time.min)
    except OverflowError:
        return inicio, datetime.max.replace(tzinfo=UTC)
    return inicio, fin_local.replace(tzinfo=ZONA_DEL_RESTAURANTE).astimezone(UTC)


def clasificar_turno(instante: datetime) -> TurnoReporte | None:
    hora_local = instante.astimezone(ZONA_DEL_RESTAURANTE).time().replace(tzinfo=None)
    if time(12) <= hora_local < time(16):
        return TurnoReporte.ALMUERZO
    if time(20) <= hora_local:
        return TurnoReporte.NOCHE
    return None


def calcular_promedio(importe: Decimal, cantidad: int) -> Decimal:
    if cantidad == 0:
        return CERO
    return (importe / Decimal(cantidad)).quantize(CENTAVO, rounding=ROUND_HALF_UP)
