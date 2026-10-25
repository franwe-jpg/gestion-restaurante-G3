import json
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.modules.productos.schemas import PlatoCrear, ProductoSalida, SeccionResumen
from app.shared.models import Categoria, Estado


def _plato(**cambios) -> PlatoCrear:
    base = {"nombre": "Milanesa", "seccion_id": 1, "precio": "1500.50", "ingredientes": ["Carne"]}
    return PlatoCrear.model_validate_json(json.dumps(base | cambios))


def _campos_con_error(**cambios) -> set[str]:
    with pytest.raises(ValidationError) as error:
        _plato(**cambios)
    return {str(falla["loc"][0]) for falla in error.value.errors()}


# CA 14
def test_plato_minimo_toma_valores_por_defecto() -> None:
    plato = _plato()

    assert plato.nombre == "Milanesa"
    assert plato.precio == Decimal("1500.50")
    assert plato.descripcion is None
    assert plato.etiquetas == []
    assert plato.CATEGORIA == Categoria.PLATO
    assert plato.MENSAJE_NOMBRE_REPETIDO == "El plato ya está registrado"


# CA 2 y CA 4
def test_nombre_se_recorta_antes_de_medirlo() -> None:
    assert _plato(nombre="  Milanesa  ").nombre == "Milanesa"
    assert _plato(nombre=f" {'a' * 100} ").nombre == "a" * 100


@pytest.mark.parametrize("nombre", ["", "   ", "a" * 101])
def test_nombre_vacio_o_de_mas_de_100_caracteres_es_invalido(nombre: str) -> None:
    assert _campos_con_error(nombre=nombre) == {"nombre"}


# CA 5
@pytest.mark.parametrize(
    "precio, esperado",
    [("1500.50", "1500.50"), ("12345678.99", "12345678.99"), (1500, "1500"), ("0.01", "0.01")],
)
def test_precio_valido(precio: str | int, esperado: str) -> None:
    assert _plato(precio=precio).precio == Decimal(esperado)


@pytest.mark.parametrize("precio", ["0", "-5", "mil", "1500.555", "123456789", "", None])
def test_precio_invalido(precio: str | None) -> None:
    assert _campos_con_error(precio=precio) == {"precio"}


# CA 6
def test_ingredientes_se_recortan_y_conservan_su_capitalizacion() -> None:
    assert _plato(ingredientes=[" Huevo ", "Pan"]).ingredientes == ["Huevo", "Pan"]


@pytest.mark.parametrize(
    "ingredientes",
    [[], [" "], ["Huevo", " huevo "], ["a" * 101], [f"i{n}" for n in range(51)]],
    ids=["vacio", "solo-espacios", "repetidos", "largo", "mas-de-50"],
)
def test_ingredientes_invalidos(ingredientes: list[str]) -> None:
    assert _campos_con_error(ingredientes=ingredientes) == {"ingredientes"}


# CA 7
def test_descripcion_de_500_caracteres_es_valida_y_501_no() -> None:
    assert _plato(descripcion="a" * 500).descripcion == "a" * 500
    assert _campos_con_error(descripcion="a" * 501) == {"descripcion"}


@pytest.mark.parametrize("descripcion", ["", "   ", None])
def test_descripcion_vacia_se_guarda_como_none(descripcion: str | None) -> None:
    assert _plato(descripcion=descripcion).descripcion is None


# CA 13
def test_etiquetas_validas() -> None:
    assert _plato(etiquetas=["Sin TACC", " Vegano "]).etiquetas == ["Sin TACC", "Vegano"]
    assert _plato(etiquetas=["a" * 30]).etiquetas == ["a" * 30]


@pytest.mark.parametrize(
    "etiquetas",
    [["a" * 31], ["casero", "Casero"], [""], [f"e{n}" for n in range(21)]],
    ids=["31-caracteres", "repetidas", "vacia", "mas-de-20"],
)
def test_etiquetas_invalidas(etiquetas: list[str]) -> None:
    assert _campos_con_error(etiquetas=etiquetas) == {"etiquetas"}


@pytest.mark.parametrize("campo, valor", [("estado", "DESHABILITADO"), ("categoria", "POSTRE")])
def test_campos_desconocidos_se_rechazan(campo: str, valor: str) -> None:
    assert _campos_con_error(**{campo: valor}) == {campo}


def test_seccion_id_debe_ser_entero_positivo() -> None:
    assert _campos_con_error(seccion_id=0) == {"seccion_id"}
    assert _campos_con_error(seccion_id="3") == {"seccion_id"}


# ProductoSalida
def test_producto_salida_serializa_el_precio_como_texto_con_dos_decimales() -> None:
    salida = ProductoSalida(
        id=1,
        nombre="Milanesa",
        categoria=Categoria.PLATO,
        precio=Decimal("1500.5"),
        ingredientes=["Carne"],
        descripcion=None,
        etiquetas=[],
        estado=Estado.HABILITADO,
        seccion=SeccionResumen(id=1, nombre="Platos"),
        imagen_url=None,
    )

    assert salida.model_dump(mode="json")["precio"] == "1500.50"
