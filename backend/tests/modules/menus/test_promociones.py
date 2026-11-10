"""Pruebas del cálculo y la vigencia de promociones (S4-02, issue #223)."""

from datetime import UTC, date, datetime, time
from decimal import Decimal

from app.modules.menus.models import DiaSemana, Promocion, TipoPromocion
from app.modules.menus.promociones import (
    PromocionAplicable,
    calcular_descuento,
    elegir_promocion,
    es_vigente,
)
from app.shared.models import Estado

MOMENTO = datetime(2026, 11, 9, 18, 0, tzinfo=UTC)  # lunes 15:00 en UTC-3
MOMENTO_18_LOCAL = datetime(2026, 11, 9, 21, 0, tzinfo=UTC)  # lunes 18:00 en UTC-3
MOMENTO_MARTES = datetime(2026, 11, 10, 18, 0, tzinfo=UTC)  # martes 15:00 en UTC-3
MOMENTO_MADRUGADA_UTC = datetime(2026, 11, 10, 1, 0, tzinfo=UTC)  # lunes 22:00 en UTC-3


def _promocion(tipo: TipoPromocion = TipoPromocion.PORCENTAJE, **cambios: object) -> Promocion:
    datos: dict[str, object] = {
        "nombre": "Promo",
        "tipo": tipo,
        "fecha_desde": date(2026, 11, 1),
        "fecha_hasta": date(2026, 11, 30),
        "dias_semana": [DiaSemana.LUNES.value],
        "estado": Estado.HABILITADO,
    }
    if tipo is TipoPromocion.PORCENTAJE:
        datos["descuento_porcentaje"] = 10
    elif tipo is TipoPromocion.PRECIO_FIJO:
        datos["precio_fijo"] = Decimal("70.00")
    else:
        datos["cant_lleva"] = 2
        datos["cant_paga"] = 1
    datos.update(cambios)
    return Promocion(**datos)


# --- Cálculo por tipo ---


def test_calcular_descuento_porcentaje() -> None:
    promocion = _promocion()

    assert calcular_descuento(promocion, Decimal("1500.50"), 2) == Decimal("300.10")


def test_calcular_descuento_porcentaje_redondea_a_dos_decimales() -> None:
    promocion = _promocion(descuento_porcentaje=15)

    assert calcular_descuento(promocion, Decimal("0.10"), 1) == Decimal("0.02")


def test_calcular_descuento_porcentaje_del_cien_es_el_bruto() -> None:
    promocion = _promocion(descuento_porcentaje=100)

    assert calcular_descuento(promocion, Decimal("50.00"), 2) == Decimal("100.00")


def test_calcular_descuento_precio_fijo() -> None:
    promocion = _promocion(TipoPromocion.PRECIO_FIJO)

    assert calcular_descuento(promocion, Decimal("100.00"), 3) == Decimal("90.00")


def test_calcular_descuento_precio_fijo_mayor_al_precio_es_cero() -> None:
    promocion = _promocion(TipoPromocion.PRECIO_FIJO, precio_fijo=Decimal("120.00"))

    assert calcular_descuento(promocion, Decimal("100.00"), 3) == Decimal("0.00")


def test_calcular_descuento_nxm_aplica_solo_grupos_completos() -> None:
    promocion = _promocion(TipoPromocion.NXM)

    assert calcular_descuento(promocion, Decimal("100.00"), 3) == Decimal("100.00")
    assert calcular_descuento(promocion, Decimal("100.00"), 5) == Decimal("200.00")


def test_calcular_descuento_nxm_sin_grupo_completo_es_cero() -> None:
    promocion = _promocion(TipoPromocion.NXM)

    assert calcular_descuento(promocion, Decimal("100.00"), 1) == Decimal("0.00")


# --- Vigencia ---


def test_es_vigente_en_fecha_dia_y_franja() -> None:
    promocion = _promocion(hora_desde=time(14, 0), hora_hasta=time(18, 0))

    assert es_vigente(promocion, MOMENTO)


def test_es_vigente_usa_la_fecha_local_del_restaurante() -> None:
    """01:00 UTC del martes sigue siendo lunes 22:00 en el restaurante."""

    assert es_vigente(_promocion(), MOMENTO_MADRUGADA_UTC)


def test_no_es_vigente_finalizada() -> None:
    promocion = _promocion(estado=Estado.DESHABILITADO)

    assert not es_vigente(promocion, MOMENTO)


def test_no_es_vigente_fuera_de_las_fechas() -> None:
    promocion = _promocion(fecha_desde=date(2026, 12, 1), fecha_hasta=date(2026, 12, 31))

    assert not es_vigente(promocion, MOMENTO)


def test_no_es_vigente_en_otro_dia_de_la_semana() -> None:
    assert not es_vigente(_promocion(), MOMENTO_MARTES)


def test_no_es_vigente_fuera_de_la_franja_horaria() -> None:
    promocion = _promocion(hora_desde=time(14, 0), hora_hasta=time(18, 0))

    assert not es_vigente(promocion, MOMENTO_18_LOCAL)


# --- Elección entre varias ---


def test_elegir_promocion_toma_la_de_mayor_descuento() -> None:
    menor = _promocion()
    menor.id = 1
    mayor = _promocion(descuento_porcentaje=25)
    mayor.id = 2

    elegida = elegir_promocion([menor, mayor], Decimal("100.00"), 1, MOMENTO)

    assert elegida == PromocionAplicable(promocion_id=2, descuento=Decimal("25.00"))


def test_elegir_promocion_en_empate_toma_la_de_menor_id() -> None:
    primera = _promocion()
    primera.id = 7
    segunda = _promocion()
    segunda.id = 3

    elegida = elegir_promocion([primera, segunda], Decimal("100.00"), 1, MOMENTO)

    assert elegida == PromocionAplicable(promocion_id=3, descuento=Decimal("10.00"))


def test_elegir_promocion_ignora_las_que_no_aplican() -> None:
    vigente = _promocion()
    vigente.id = 1
    vencida = _promocion(fecha_hasta=date(2026, 10, 31))
    vencida.id = 2

    elegida = elegir_promocion([vencida, vigente], Decimal("100.00"), 1, MOMENTO)

    assert elegida == PromocionAplicable(promocion_id=1, descuento=Decimal("10.00"))


def test_elegir_promocion_sin_descuento_devuelve_none() -> None:
    promocion = _promocion(TipoPromocion.NXM)
    promocion.id = 1

    assert elegir_promocion([promocion], Decimal("100.00"), 1, MOMENTO) is None
