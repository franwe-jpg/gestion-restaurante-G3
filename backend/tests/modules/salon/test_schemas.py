"""Pruebas de los esquemas de sector (HU-M3-01)."""

import pytest
from pydantic import ValidationError

from app.modules.salon.schemas import SectorCrear, SectorSalida
from app.shared.models import Estado


def _sector(**cambios) -> SectorCrear:
    return SectorCrear.model_validate({"nombre": "Salón principal"} | cambios)


def _campos_con_error(**cambios) -> set[str]:
    with pytest.raises(ValidationError) as error:
        _sector(**cambios)
    return {str(falla["loc"][0]) for falla in error.value.errors()}


# CA 1
def test_alta_minima_solo_exige_el_nombre() -> None:
    datos = _sector()

    assert datos.nombre == "Salón principal"
    assert datos.descripcion is None


def test_acepta_descripcion() -> None:
    assert _sector(descripcion="Al aire libre").descripcion == "Al aire libre"


# CA 2
@pytest.mark.parametrize("nombre", ["", "   "], ids=["vacio", "solo-espacios"])
def test_nombre_vacio_o_solo_espacios_es_invalido(nombre: str) -> None:
    assert _campos_con_error(nombre=nombre) == {"nombre"}


def test_sin_nombre_es_invalido() -> None:
    with pytest.raises(ValidationError) as error:
        SectorCrear.model_validate({})

    assert {str(falla["loc"][0]) for falla in error.value.errors()} == {"nombre"}


# CA 5
def test_nombre_de_30_caracteres_es_valido() -> None:
    assert _sector(nombre="a" * 30).nombre == "a" * 30


def test_nombre_de_31_caracteres_es_invalido() -> None:
    assert _campos_con_error(nombre="a" * 31) == {"nombre"}


def test_nombre_se_recorta_antes_de_medirlo() -> None:
    assert _sector(nombre="  Terraza  ").nombre == "Terraza"
    assert _sector(nombre=f" {'a' * 30} ").nombre == "a" * 30


# Descripcion (S2)
def test_descripcion_de_200_caracteres_es_valida_y_201_no() -> None:
    assert _sector(descripcion="a" * 200).descripcion == "a" * 200
    assert _campos_con_error(descripcion="a" * 201) == {"descripcion"}


@pytest.mark.parametrize("descripcion", ["", "   ", None])
def test_descripcion_vacia_se_guarda_como_none(descripcion: str | None) -> None:
    assert _sector(descripcion=descripcion).descripcion is None


def test_descripcion_se_recorta() -> None:
    assert _sector(descripcion="  Al aire libre  ").descripcion == "Al aire libre"


# CA 6: el estado lo asigna el sistema
@pytest.mark.parametrize(
    "campo, valor",
    [("estado", "DESHABILITADO"), ("id", 1)],
    ids=["estado", "id"],
)
def test_campos_desconocidos_se_rechazan(campo: str, valor: object) -> None:
    assert _campos_con_error(**{campo: valor}) == {campo}


# SectorSalida
def test_sector_salida_expone_id_nombre_descripcion_y_estado() -> None:
    salida = SectorSalida(id=1, nombre="Terraza", descripcion=None, estado=Estado.HABILITADO)

    assert salida.model_dump(mode="json") == {
        "id": 1,
        "nombre": "Terraza",
        "descripcion": None,
        "estado": "HABILITADO",
    }
