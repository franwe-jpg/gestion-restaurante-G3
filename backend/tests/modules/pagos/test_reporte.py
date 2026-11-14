"""Pruebas del cálculo puro del reporte de recaudación (HU-M6-08), sin base de datos."""

from datetime import UTC, date, datetime
from decimal import Decimal

import pytest

from app.modules.pagos import reporte
from app.modules.pagos.models import TipoMedioPago
from app.modules.pagos.schemas import AdeudadoSalida, CobradoPorMedio
from app.shared.excepciones import DatosInvalidosError

DESDE = date(2026, 10, 1)
HASTA = date(2026, 10, 31)


def _medio(medio_pago_id: int, monto: str) -> CobradoPorMedio:
    return CobradoPorMedio(
        medio_pago_id=medio_pago_id,
        nombre=f"Medio {medio_pago_id}",
        tipo=TipoMedioPago.EFECTIVO,
        cantidad_cobros=1,
        monto=Decimal(monto),
    )


@pytest.mark.parametrize(
    ("desde", "hasta", "mensaje"),
    [
        (None, None, "Faltan la fecha desde y la fecha hasta."),
        (None, HASTA, "Falta la fecha desde."),
        (DESDE, None, "Falta la fecha hasta."),
        (
            HASTA,
            DESDE,
            "El período es inválido: la fecha desde es posterior a la fecha hasta.",
        ),
    ],
)
def test_validar_periodo_rechaza_un_periodo_incompleto_o_inverso(
    desde: date | None, hasta: date | None, mensaje: str
) -> None:
    with pytest.raises(DatosInvalidosError) as error:
        reporte.validar_periodo(desde, hasta)

    assert str(error.value) == mensaje


def test_validar_periodo_acepta_fechas_iguales() -> None:
    assert reporte.validar_periodo(DESDE, DESDE) == (DESDE, DESDE)


def test_intervalo_utc_va_de_las_0_horas_locales_de_desde_a_las_0_horas_de_hasta_mas_uno() -> None:
    assert reporte.intervalo_utc(DESDE, HASTA) == (
        datetime(2026, 10, 1, 3, 0, tzinfo=UTC),
        datetime(2026, 11, 1, 3, 0, tzinfo=UTC),
    )


def test_armar_resumen_suma_los_montos_de_los_medios() -> None:
    adeudado = AdeudadoSalida(cantidad_facturas=2, monto=Decimal("1250.50"))

    resumen = reporte.armar_resumen(
        DESDE, HASTA, [_medio(1, "1500.00"), _medio(2, "2000.00")], adeudado
    )

    assert resumen.total_cobrado == Decimal("3500.00")
    assert resumen.fecha_desde == DESDE
    assert resumen.fecha_hasta == HASTA
    assert resumen.adeudado == adeudado


def test_armar_resumen_sin_medios_da_total_cero() -> None:
    adeudado = AdeudadoSalida(cantidad_facturas=0, monto=Decimal("0.00"))

    resumen = reporte.armar_resumen(DESDE, HASTA, [], adeudado)

    assert resumen.por_medio_pago == []
    assert resumen.total_cobrado == Decimal("0.00")
