"""Pruebas de los schemas de menús ejecutivos (HU-M2-01)."""

import pytest
from pydantic import ValidationError

from app.modules.menus.schemas import MenuEjecutivoCrear


def _datos() -> dict:
    return {
        "nombre": "Almuerzo ejecutivo",
        "precio_fijo": "1500.00",
        "producto_ids": [1],
        "seccion_id": 1,
        "descripcion": "Incluye bebida",
    }


def test_schema_acepta_datos_validos_y_recorta_nombre() -> None:
    datos = _datos() | {"nombre": "  Almuerzo ejecutivo  "}

    salida = MenuEjecutivoCrear.model_validate(datos)

    assert salida.nombre == "Almuerzo ejecutivo"
    assert str(salida.precio_fijo) == "1500.00"
    assert salida.producto_ids == [1]


@pytest.mark.parametrize(
    "cuerpo,campo",
    [
        ({"nombre": ""}, "nombre"),
        ({"nombre": "x" * 101}, "nombre"),
        ({"precio_fijo": "0"}, "precio_fijo"),
        ({"precio_fijo": "-1"}, "precio_fijo"),
        ({"precio_fijo": "1.001"}, "precio_fijo"),
        ({"producto_ids": []}, "producto_ids"),
        ({"producto_ids": [1, 1]}, "producto_ids"),
        ({"seccion_id": 0}, "seccion_id"),
        ({"descripcion": "x" * 501}, "descripcion"),
        ({"estado": "DESHABILITADO"}, "estado"),
    ],
    ids=[
        "nombre-vacio",
        "nombre-101",
        "precio-cero",
        "precio-negativo",
        "precio-tres-decimales",
        "sin-productos",
        "producto-duplicado",
        "seccion-cero",
        "descripcion-501",
        "estado-extra",
    ],
)
def test_schema_rechaza_datos_invalidos(cuerpo: dict, campo: str) -> None:
    with pytest.raises(ValidationError) as error:
        MenuEjecutivoCrear.model_validate(_datos() | cuerpo)

    assert campo in str(error.value)
