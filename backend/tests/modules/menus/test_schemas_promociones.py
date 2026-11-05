"""Pruebas de los schemas de promociones (HU-M2-07)."""

from datetime import date, time
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.modules.menus.models import DiaSemana, TipoPromocion
from app.modules.menus.schemas import PromocionCrear


def _datos(**cambios: object) -> dict:
    base = {
        "nombre": "Happy hour",
        "tipo": "PORCENTAJE",
        "descripcion": "Descuento de tarde",
        "producto_ids": [1, 2],
        "fecha_desde": date(2026, 11, 1),
        "fecha_hasta": date(2026, 11, 30),
        "dias_semana": ["LUNES", "MARTES"],
        "hora_desde": time(17, 0),
        "hora_hasta": time(20, 30),
        "descuento_porcentaje": 15,
    }
    return base | cambios


def test_schema_acepta_porcentaje_valido_y_normaliza_nombre() -> None:
    datos = PromocionCrear.model_validate(_datos(nombre="  Happy hour  "))

    assert datos.nombre == "Happy hour"
    assert datos.tipo == TipoPromocion.PORCENTAJE
    assert datos.dias_semana == [DiaSemana.LUNES, DiaSemana.MARTES]
    assert datos.descuento_porcentaje == 15
    assert datos.precio_fijo is None


def test_schema_acepta_precio_fijo_valido() -> None:
    datos = PromocionCrear.model_validate(
        _datos(tipo="PRECIO_FIJO", descuento_porcentaje=None, precio_fijo=Decimal("1500.00"))
    )

    assert datos.tipo == TipoPromocion.PRECIO_FIJO
    assert datos.precio_fijo == Decimal("1500.00")


def test_schema_acepta_nxm_valido() -> None:
    datos = PromocionCrear.model_validate(
        _datos(tipo="NXM", descuento_porcentaje=None, cant_lleva=2, cant_paga=1)
    )

    assert datos.tipo == TipoPromocion.NXM
    assert (datos.cant_lleva, datos.cant_paga) == (2, 1)


def test_schema_acepta_franja_horaria_vacia() -> None:
    datos = PromocionCrear.model_validate(_datos(hora_desde=None, hora_hasta=None))

    assert datos.hora_desde is None
    assert datos.hora_hasta is None


@pytest.mark.parametrize(
    "cambios,fragmento",
    [
        ({"nombre": ""}, "nombre"),
        ({"nombre": "x" * 101}, "nombre"),
        ({"tipo": None}, "tipo"),
        ({"fecha_desde": None}, "fecha_desde"),
        ({"fecha_hasta": None}, "fecha_hasta"),
        ({"fecha_hasta": date(2026, 10, 31)}, "fecha hasta"),
        ({"hora_desde": None}, "franja horaria"),
        ({"hora_hasta": None}, "franja horaria"),
        ({"hora_hasta": time(17, 0)}, "hora hasta"),
        ({"hora_hasta": time(16, 0)}, "hora hasta"),
        ({"dias_semana": []}, "dias_semana"),
        ({"dias_semana": ["LUNES", "LUNES"]}, "días"),
        ({"producto_ids": []}, "producto_ids"),
        ({"producto_ids": [1, 1]}, "productos"),
        ({"descuento_porcentaje": None}, "descuento"),
        ({"descuento_porcentaje": 0}, "descuento"),
        ({"descuento_porcentaje": 101}, "descuento"),
        ({"descuento_porcentaje": 1.5}, "descuento"),
        ({"descuento_porcentaje": 10, "precio_fijo": Decimal("100.00")}, "porcentaje"),
        ({"descripcion": "x" * 501}, "descripcion"),
        ({"estado": "HABILITADO"}, "estado"),
    ],
    ids=[
        "nombre-vacio",
        "nombre-101",
        "sin-tipo",
        "sin-fecha-desde",
        "sin-fecha-hasta",
        "fecha-hasta-anterior",
        "solo-hora-desde",
        "solo-hora-hasta",
        "horas-iguales",
        "hora-hasta-anterior",
        "sin-dias",
        "dias-repetidos",
        "sin-productos",
        "productos-repetidos",
        "porcentaje-ausente",
        "porcentaje-cero",
        "porcentaje-101",
        "porcentaje-no-entero",
        "porcentaje-con-precio",
        "descripcion-501",
        "estado-extra",
    ],
)
def test_schema_rechaza_datos_invalidos(cambios: dict, fragmento: str) -> None:
    with pytest.raises(ValidationError) as error:
        PromocionCrear.model_validate(_datos(**cambios))

    assert fragmento.casefold() in str(error.value).casefold()


@pytest.mark.parametrize(
    "cambios,fragmento",
    [
        ({"tipo": "PRECIO_FIJO", "descuento_porcentaje": None}, "precio fijo"),
        ({"tipo": "PRECIO_FIJO", "descuento_porcentaje": None, "precio_fijo": 0}, "precio"),
        ({"tipo": "PRECIO_FIJO", "descuento_porcentaje": None, "precio_fijo": -1}, "precio"),
        (
            {"tipo": "PRECIO_FIJO", "descuento_porcentaje": None, "precio_fijo": "1.001"},
            "precio",
        ),
        (
            {
                "tipo": "PRECIO_FIJO",
                "descuento_porcentaje": None,
                "precio_fijo": Decimal("100.00"),
                "cant_lleva": 2,
            },
            "precio_fijo",
        ),
        ({"tipo": "NXM", "descuento_porcentaje": None}, "cantidades"),
        (
            {"tipo": "NXM", "descuento_porcentaje": None, "cant_lleva": 2},
            "cantidades",
        ),
        (
            {"tipo": "NXM", "descuento_porcentaje": None, "cant_lleva": 0, "cant_paga": 1},
            "cant_lleva",
        ),
        (
            {"tipo": "NXM", "descuento_porcentaje": None, "cant_lleva": 2, "cant_paga": 2},
            "paga",
        ),
        (
            {"tipo": "NXM", "descuento_porcentaje": None, "cant_lleva": 1, "cant_paga": 2},
            "paga",
        ),
        (
            {
                "tipo": "NXM",
                "descuento_porcentaje": None,
                "cant_lleva": 2,
                "cant_paga": 1,
                "precio_fijo": Decimal("100.00"),
            },
            "nxm",
        ),
    ],
    ids=[
        "precio-fijo-ausente",
        "precio-cero",
        "precio-negativo",
        "precio-tres-decimales",
        "precio-con-cantidades",
        "nxm-sin-cantidades",
        "nxm-sin-paga",
        "nxm-lleva-cero",
        "nxm-paga-igual",
        "nxm-paga-mayor",
        "nxm-con-precio",
    ],
)
def test_schema_valida_campos_del_tipo(cambios: dict, fragmento: str) -> None:
    with pytest.raises(ValidationError) as error:
        PromocionCrear.model_validate(_datos(**cambios))

    assert fragmento.casefold() in str(error.value).casefold()
