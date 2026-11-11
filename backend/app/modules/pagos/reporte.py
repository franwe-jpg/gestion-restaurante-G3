"""pagos: cálculo puro del reporte de recaudación por medio de pago (HU-M6-08), sin base."""

from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal

from app.modules.pagos.comprobante_pdf import ZONA_DEL_RESTAURANTE
from app.modules.pagos.schemas import AdeudadoSalida, CobradoPorMedio, ResumenRecaudacion
from app.shared.excepciones import DatosInvalidosError


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


def intervalo_utc(desde: date, hasta: date) -> tuple[datetime, datetime]:
    """Intervalo semiabierto en UTC: de las 00:00 locales de `desde` a las 00:00 de `hasta + 1`."""
    inicio = datetime.combine(desde, time.min, tzinfo=ZONA_DEL_RESTAURANTE).astimezone(UTC)
    try:
        fin_local = datetime.combine(hasta + timedelta(days=1), time.min)
    except OverflowError:
        return inicio, datetime.max.replace(tzinfo=UTC)
    return inicio, fin_local.replace(tzinfo=ZONA_DEL_RESTAURANTE).astimezone(UTC)


def armar_resumen(
    desde: date, hasta: date, por_medio: list[CobradoPorMedio], adeudado: AdeudadoSalida
) -> ResumenRecaudacion:
    """El total cobrado es la suma de los montos de los medios."""
    return ResumenRecaudacion(
        fecha_desde=desde,
        fecha_hasta=hasta,
        por_medio_pago=por_medio,
        total_cobrado=sum((medio.monto for medio in por_medio), Decimal("0.00")),
        adeudado=adeudado,
    )
