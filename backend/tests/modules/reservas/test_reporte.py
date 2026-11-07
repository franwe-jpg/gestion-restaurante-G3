"""Pruebas del cálculo puro del reporte de reservas y ausentismo (HU-M5-07), sin base de datos."""

from datetime import date
from decimal import Decimal

import pytest

from app.modules.reservas import reporte
from app.modules.reservas.models import EstadoReserva
from app.shared.excepciones import DatosInvalidosError


@pytest.mark.parametrize(
    ("desde", "hasta", "mensaje"),
    [
        (None, None, "Faltan la fecha desde y la fecha hasta."),
        (None, date(2026, 10, 31), "Falta la fecha desde."),
        (date(2026, 10, 1), None, "Falta la fecha hasta."),
    ],
)
def test_validar_periodo_rechaza_fechas_faltantes(
    desde: date | None, hasta: date | None, mensaje: str
) -> None:
    with pytest.raises(DatosInvalidosError) as error:
        reporte.validar_periodo(desde, hasta)

    assert str(error.value) == mensaje


def test_validar_periodo_rechaza_desde_posterior_a_hasta() -> None:
    with pytest.raises(DatosInvalidosError) as error:
        reporte.validar_periodo(date(2026, 10, 31), date(2026, 10, 1))

    assert str(error.value) == (
        "El período es inválido: la fecha desde es posterior a la fecha hasta."
    )


def test_validar_periodo_acepta_un_solo_dia() -> None:
    dia = date(2026, 10, 15)

    assert reporte.validar_periodo(dia, dia) == (dia, dia)


@pytest.mark.parametrize(
    ("por_ausencia", "total", "esperado"),
    [
        (2, 10, Decimal("20.00")),
        (1, 3, Decimal("33.33")),
        (2, 3, Decimal("66.67")),
        (0, 5, Decimal("0.00")),
        (4, 4, Decimal("100.00")),
    ],
)
def test_calcular_porcentaje_ausentismo(por_ausencia: int, total: int, esperado: Decimal) -> None:
    assert reporte.calcular_porcentaje_ausentismo(por_ausencia, total) == esperado


def test_calcular_porcentaje_ausentismo_sin_reservas_devuelve_none() -> None:
    assert reporte.calcular_porcentaje_ausentismo(0, 0) is None


def test_armar_resumen_completa_con_cero_los_estados_ausentes() -> None:
    resumen = reporte.armar_resumen(
        date(2026, 10, 1), date(2026, 10, 31), {EstadoReserva.ACTIVA: 3}
    )

    assert resumen.total_reservas == 3
    assert resumen.atendidas == 0
    assert resumen.canceladas_anticipada == 0
    assert resumen.canceladas_por_ausencia == 0
    assert resumen.porcentaje_ausentismo == Decimal("0.00")


def test_armar_resumen_total_incluye_activa() -> None:
    resumen = reporte.armar_resumen(
        date(2026, 10, 1),
        date(2026, 10, 31),
        {
            EstadoReserva.ACTIVA: 2,
            EstadoReserva.ATENDIDA: 1,
            EstadoReserva.CANCELADA_ANTICIPADA: 2,
            EstadoReserva.CANCELADA_POR_AUSENCIA: 1,
        },
    )

    assert resumen.total_reservas == 6
    assert resumen.atendidas == 1
    assert resumen.canceladas_anticipada == 2
    assert resumen.canceladas_por_ausencia == 1


def test_armar_resumen_sin_conteos_devuelve_todo_en_cero_y_porcentaje_none() -> None:
    resumen = reporte.armar_resumen(date(2026, 1, 1), date(2026, 1, 31), {})

    assert resumen.total_reservas == 0
    assert resumen.porcentaje_ausentismo is None


@pytest.mark.parametrize(
    "conteos",
    [
        {},
        {EstadoReserva.ACTIVA: 1},
        {EstadoReserva.CANCELADA_POR_AUSENCIA: 2, EstadoReserva.ACTIVA: 3},
    ],
)
def test_armar_resumen_invariante_total_cero_equivale_a_porcentaje_none(
    conteos: dict[EstadoReserva, int],
) -> None:
    resumen = reporte.armar_resumen(date(2026, 1, 1), date(2026, 1, 31), conteos)

    assert (resumen.total_reservas == 0) == (resumen.porcentaje_ausentismo is None)
