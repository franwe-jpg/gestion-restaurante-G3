"""Funciones puras del reporte de productos más vendidos (HU-M1-15), sin base de datos."""

from datetime import UTC, date, datetime
from decimal import Decimal

import pytest

from app.modules.atencion.service import CantidadPedidaPorFranja as Franja
from app.modules.productos import reporte
from app.modules.productos.models import Seccion
from app.modules.productos.schemas import DiaSemana, FranjaHoraria
from app.shared.excepciones import DatosInvalidosError
from app.shared.models import Categoria, Estado, Producto


def _producto(id: int, nombre: str, seccion_id: int = 1, estado: Estado = Estado.HABILITADO):
    return Producto(
        id=id,
        nombre=nombre,
        nombre_normalizado=nombre.lower(),
        categoria=Categoria.PLATO,
        precio=Decimal("10"),
        ingredientes=[],
        etiquetas=[],
        estado=estado,
        seccion_id=seccion_id,
    )


def _seccion(id: int, nombre: str, orden: int, estado: Estado = Estado.HABILITADO):
    return Seccion(id=id, nombre=nombre, orden=orden, estado=estado)


# CA 3
@pytest.mark.parametrize(
    ("desde", "hasta", "mensaje"),
    [
        (None, date(2026, 11, 5), "Falta la fecha desde."),
        (date(2026, 11, 5), None, "Falta la fecha hasta."),
        (None, None, "Faltan la fecha desde y la fecha hasta."),
    ],
)
def test_validar_periodo_rechaza_fechas_faltantes(desde, hasta, mensaje) -> None:
    with pytest.raises(DatosInvalidosError) as error:
        reporte.validar_periodo(desde, hasta)

    assert str(error.value) == mensaje


# CA 4
def test_validar_periodo_rechaza_desde_posterior_a_hasta() -> None:
    with pytest.raises(DatosInvalidosError) as error:
        reporte.validar_periodo(date(2026, 11, 10), date(2026, 11, 5))

    assert str(error.value) == (
        "El período es inválido: la fecha desde es posterior a la fecha hasta."
    )


def test_validar_periodo_acepta_un_solo_dia() -> None:
    dia = date(2026, 11, 5)

    assert reporte.validar_periodo(dia, dia) == (dia, dia)


def test_intervalo_utc_va_de_medianoche_local_a_medianoche_local_siguiente() -> None:
    desde, hasta = reporte.intervalo_utc(date(2026, 11, 5), date(2026, 11, 5))

    assert desde == datetime(2026, 11, 5, 3, tzinfo=UTC)
    assert hasta == datetime(2026, 11, 6, 3, tzinfo=UTC)


def test_intervalo_utc_incluye_el_dia_local_completo_de_hasta() -> None:
    _, hasta = reporte.intervalo_utc(date(2026, 11, 1), date(2026, 11, 5))

    assert datetime(2026, 11, 6, 2, 59, 59, tzinfo=UTC) < hasta
    assert not datetime(2026, 11, 6, 3, tzinfo=UTC) < hasta


def test_intervalo_utc_recorta_el_desborde_de_la_fecha_maxima() -> None:
    _, hasta = reporte.intervalo_utc(date(2026, 11, 1), date.max)

    assert hasta.year == 9999


def test_dias_mas_pedidos_suma_cantidades_y_no_lineas() -> None:
    franjas = [Franja(1, 0, 10, 5), Franja(1, 3, 10, 1), Franja(1, 3, 11, 1), Franja(1, 3, 12, 1)]

    assert reporte.dias_mas_pedidos(franjas) == [DiaSemana.LUNES]


def test_dias_mas_pedidos_un_solo_dia() -> None:
    franjas = [Franja(1, 4, 21, 6), Franja(1, 1, 13, 2)]

    assert reporte.dias_mas_pedidos(franjas) == [DiaSemana.VIERNES]


def test_dias_mas_pedidos_empate_va_de_lunes_a_domingo() -> None:
    franjas = [Franja(1, 5, 20, 4), Franja(1, 4, 20, 4), Franja(1, 1, 20, 1)]

    assert reporte.dias_mas_pedidos(franjas) == [DiaSemana.VIERNES, DiaSemana.SABADO]


def test_franjas_mas_pedidas_una_sola() -> None:
    franjas = [Franja(1, 4, 21, 6), Franja(1, 1, 13, 2)]

    assert reporte.franjas_mas_pedidas(franjas) == [FranjaHoraria(hora_desde=21, hora_hasta=22)]


def test_franjas_mas_pedidas_empate_va_en_orden_ascendente() -> None:
    franjas = [Franja(1, 0, 21, 3), Franja(1, 2, 13, 3)]

    assert reporte.franjas_mas_pedidas(franjas) == [
        FranjaHoraria(hora_desde=13, hora_hasta=14),
        FranjaHoraria(hora_desde=21, hora_hasta=22),
    ]


def test_franjas_mas_pedidas_junta_la_misma_hora_de_distintos_dias() -> None:
    franjas = [Franja(1, 0, 13, 2), Franja(1, 2, 13, 2), Franja(1, 1, 21, 3)]

    assert reporte.franjas_mas_pedidas(franjas) == [FranjaHoraria(hora_desde=13, hora_hasta=14)]


def test_franjas_mas_pedidas_la_franja_de_las_23_cruza_la_medianoche() -> None:
    assert reporte.franjas_mas_pedidas([Franja(1, 0, 23, 1)]) == [
        FranjaHoraria(hora_desde=23, hora_hasta=0)
    ]


def test_armar_secciones_ordena_productos_por_cantidad_y_secciones_por_orden() -> None:
    productos = [_producto(1, "Milanesa", 1), _producto(2, "Ñoquis", 1), _producto(3, "Agua", 2)]
    secciones = {1: _seccion(1, "Platos", 2), 2: _seccion(2, "Bebidas", 1)}
    franjas = [Franja(1, 0, 13, 5), Franja(2, 0, 13, 9), Franja(3, 0, 13, 3)]

    resultado = reporte.armar_secciones(franjas, productos, secciones)

    assert [s.nombre for s in resultado] == ["Bebidas", "Platos"]
    assert [(p.nombre, p.cantidad_pedida) for p in resultado[1].productos] == [
        ("Ñoquis", 9),
        ("Milanesa", 5),
    ]


def test_armar_secciones_suma_las_franjas_de_un_mismo_producto() -> None:
    productos = [_producto(1, "Flan")]
    franjas = [Franja(1, 0, 13, 3), Franja(1, 1, 14, 2)]

    resultado = reporte.armar_secciones(franjas, productos, {1: _seccion(1, "Postres", 1)})

    assert resultado[0].productos[0].cantidad_pedida == 5


def test_armar_secciones_desempata_por_nombre_y_luego_por_id() -> None:
    productos = [_producto(1, "Tarta"), _producto(2, "Ensalada"), _producto(3, "Ensalada")]
    franjas = [Franja(1, 0, 13, 4), Franja(2, 0, 13, 4), Franja(3, 0, 13, 4)]

    resultado = reporte.armar_secciones(franjas, productos, {1: _seccion(1, "Platos", 1)})

    assert [p.producto_id for p in resultado[0].productos] == [2, 3, 1]


def test_armar_secciones_omite_productos_y_secciones_sin_pedidos() -> None:
    productos = [_producto(1, "Pizza", 1), _producto(2, "Flan", 1), _producto(3, "Agua", 2)]
    secciones = {1: _seccion(1, "Platos", 1), 2: _seccion(2, "Bebidas", 2)}

    resultado = reporte.armar_secciones([Franja(1, 0, 13, 1)], productos, secciones)

    assert [s.nombre for s in resultado] == ["Platos"]
    assert [p.nombre for p in resultado[0].productos] == ["Pizza"]


def test_armar_secciones_incluye_deshabilitados_con_su_estado() -> None:
    productos = [_producto(1, "Flan", 1, Estado.DESHABILITADO)]
    secciones = {1: _seccion(1, "Postres", 1, Estado.DESHABILITADO)}

    resultado = reporte.armar_secciones([Franja(1, 0, 13, 2)], productos, secciones)

    assert resultado[0].productos[0].estado == Estado.DESHABILITADO


def test_armar_secciones_sin_datos_devuelve_lista_vacia() -> None:
    assert reporte.armar_secciones([], [], {}) == []
