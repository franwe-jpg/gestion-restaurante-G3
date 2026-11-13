from datetime import UTC, date, datetime
from decimal import Decimal

import pytest

from app.modules.atencion import reporte
from app.shared.excepciones import DatosInvalidosError


def test_validar_periodo_permite_fecha_especifica() -> None:
    dia = date(2026, 11, 12)

    assert reporte.validar_periodo(dia, dia) == (dia, dia)


def test_validar_periodo_rechaza_rango_inverso() -> None:
    with pytest.raises(DatosInvalidosError, match="posterior"):
        reporte.validar_periodo(date(2026, 11, 13), date(2026, 11, 12))


@pytest.mark.parametrize(
    ("hora_local", "turno_esperado"),
    [
        ("11:59:59", None),
        ("12:00:00", "ALMUERZO"),
        ("15:59:59", "ALMUERZO"),
        ("16:00:00", None),
        ("19:59:59", None),
        ("20:00:00", "NOCHE"),
        ("23:59:59", "NOCHE"),
    ],
)
def test_clasificar_turno_respeta_limites_locales(hora_local: str, turno_esperado: str | None):
    instante_local = datetime.fromisoformat(f"2026-11-12T{hora_local}")
    instante_utc = instante_local.replace(tzinfo=reporte.ZONA_DEL_RESTAURANTE).astimezone(UTC)

    assert reporte.clasificar_turno(instante_utc) == turno_esperado


def test_ticket_promedio_usa_decimal_y_redondea_medio_hacia_arriba() -> None:
    assert reporte.calcular_promedio(Decimal("10.00"), 3) == Decimal("3.33")


def test_intervalo_utc_convierte_fechas_locales() -> None:
    inicio, fin = reporte.intervalo_utc(date(2026, 11, 12), date(2026, 11, 12))

    assert inicio == datetime(2026, 11, 12, 3, tzinfo=UTC)
    assert fin == datetime(2026, 11, 13, 3, tzinfo=UTC)
