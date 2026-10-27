"""Pruebas de los schemas del menu del dia (HU-M2-04)."""

from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.modules.menus.schemas import FiltroMenusDelDia, MenuDelDiaCrear, MenuDelDiaModificar
from app.shared.models import Estado


def _datos(**cambios) -> dict:
    base = {
        "nombre": "Guiso de lentejas",
        "seccion_id": 1,
        "precio": "9900.00",
        "ingredientes": ["Lentejas", "Chorizo colorado"],
    }
    return base | cambios


# CA 15
def test_menu_del_dia_minimo_no_exige_descripcion_imagen_ni_etiquetas() -> None:
    datos = MenuDelDiaCrear(**_datos())

    assert (datos.descripcion, datos.etiquetas) == (None, [])
    assert datos.precio == Decimal("9900.00")


def test_menu_del_dia_quita_espacios_del_nombre() -> None:
    assert MenuDelDiaCrear(**_datos(nombre="  Guiso  ")).nombre == "Guiso"


# CA 4
@pytest.mark.parametrize("nombre", ["", "   ", "x" * 101])
def test_menu_del_dia_rechaza_nombre_vacio_o_largo(nombre: str) -> None:
    with pytest.raises(ValidationError):
        MenuDelDiaCrear(**_datos(nombre=nombre))


# CA 5
@pytest.mark.parametrize("precio", ["0", "-1", "10.999"])
def test_menu_del_dia_rechaza_precio_invalido(precio: str) -> None:
    with pytest.raises(ValidationError):
        MenuDelDiaCrear(**_datos(precio=precio))


# CA 7
def test_menu_del_dia_exige_al_menos_un_ingrediente() -> None:
    with pytest.raises(ValidationError):
        MenuDelDiaCrear(**_datos(ingredientes=[]))


# CA 6
@pytest.mark.parametrize(
    "ingredientes",
    [["Lentejas", "lentejas"], ["Lentejas", "  "], [""]],
)
def test_menu_del_dia_rechaza_ingrediente_vacio_o_repetido(ingredientes: list[str]) -> None:
    with pytest.raises(ValidationError):
        MenuDelDiaCrear(**_datos(ingredientes=ingredientes))


# CA 8
def test_menu_del_dia_rechaza_descripcion_mayor_a_500() -> None:
    with pytest.raises(ValidationError):
        MenuDelDiaCrear(**_datos(descripcion="x" * 501))


def test_menu_del_dia_descripcion_vacia_queda_en_none() -> None:
    assert MenuDelDiaCrear(**_datos(descripcion="   ")).descripcion is None


# CA 14
@pytest.mark.parametrize(
    "etiquetas",
    [[""], ["x" * 31], ["Casero", "casero"]],
)
def test_menu_del_dia_rechaza_etiqueta_vacia_larga_o_repetida(etiquetas: list[str]) -> None:
    with pytest.raises(ValidationError):
        MenuDelDiaCrear(**_datos(etiquetas=etiquetas))


def test_menu_del_dia_no_acepta_categoria_ni_estado() -> None:
    with pytest.raises(ValidationError):
        MenuDelDiaCrear(**_datos(categoria="MENU_DEL_DIA"))
    with pytest.raises(ValidationError):
        MenuDelDiaCrear(**_datos(estado="DESHABILITADO"))


def test_menu_del_dia_modificar_conserva_el_estado_ausente() -> None:
    assert MenuDelDiaModificar(**_datos()).estado is None


def test_menu_del_dia_modificar_acepta_reactivar() -> None:
    assert MenuDelDiaModificar(**_datos(estado="HABILITADO")).estado == Estado.HABILITADO


# Filtro de la lista (HU-M2-06, CA 4)
def test_filtro_de_menus_por_defecto_muestra_solo_habilitados() -> None:
    assert FiltroMenusDelDia().estado_elegido() == Estado.HABILITADO


def test_filtro_de_menus_todos_no_filtra() -> None:
    assert FiltroMenusDelDia(estado="TODOS").estado_elegido() is None


def test_filtro_de_menus_deshabilitados() -> None:
    assert FiltroMenusDelDia(estado="DESHABILITADO").estado_elegido() == Estado.DESHABILITADO
