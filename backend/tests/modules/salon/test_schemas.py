"""Pruebas de los esquemas de sector (HU-M3-01)."""

import pytest
from pydantic import ValidationError

from app.modules.salon.schemas import (
    MesaCrear,
    MesaSalida,
    SectorCrear,
    SectorModificar,
    SectorResumen,
    SectorSalida,
)
from app.shared.models import Estado
from app.shared.models.enums import EstadoMesa


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


# --- HU-M3-02: esquema de modificacion de sector ---


def _modificar(**cambios) -> SectorModificar:
    return SectorModificar.model_validate({"nombre": "Terraza"} | cambios)


def _campos_modificar_con_error(**cambios) -> set[str]:
    with pytest.raises(ValidationError) as error:
        _modificar(**cambios)
    return {str(falla["loc"][0]) for falla in error.value.errors()}


def test_sector_modificar_hereda_las_reglas_del_alta() -> None:
    assert issubclass(SectorModificar, SectorCrear)
    assert set(SectorModificar.model_fields) == {"nombre", "descripcion"}


# CA 2
def test_sector_modificar_exige_el_nombre() -> None:
    with pytest.raises(ValidationError) as error:
        SectorModificar.model_validate({})

    assert {str(falla["loc"][0]) for falla in error.value.errors()} == {"nombre"}


@pytest.mark.parametrize("nombre", ["", "   "], ids=["vacio", "solo-espacios"])
def test_sector_modificar_rechaza_nombre_vacio(nombre: str) -> None:
    assert _campos_modificar_con_error(nombre=nombre) == {"nombre"}


def test_sector_modificar_recorta_y_mide_el_nombre() -> None:
    assert _modificar(nombre="  Terraza  ").nombre == "Terraza"
    assert _modificar(nombre="a" * 30).nombre == "a" * 30
    assert _campos_modificar_con_error(nombre="a" * 31) == {"nombre"}


@pytest.mark.parametrize("descripcion", ["", "   ", None])
def test_sector_modificar_convierte_descripcion_vacia_en_none(descripcion: str | None) -> None:
    assert _modificar(descripcion=descripcion).descripcion is None


def test_sector_modificar_recorta_la_descripcion_y_rechaza_201() -> None:
    assert _modificar(descripcion="  Al aire libre  ").descripcion == "Al aire libre"
    assert _campos_modificar_con_error(descripcion="a" * 201) == {"descripcion"}


# CA 6 y M6: el estado no se recibe
@pytest.mark.parametrize(
    "campo, valor",
    [("estado", "DESHABILITADO"), ("id", 1)],
    ids=["estado", "id"],
)
def test_sector_modificar_rechaza_campos_desconocidos(campo: str, valor: object) -> None:
    assert _campos_modificar_con_error(**{campo: valor}) == {campo}


# --- HU-M3-05: esquemas de mesa ---


def _mesa(**cambios):
    return MesaCrear.model_validate({"numero": 13, "capacidad": 4, "sector_id": 1} | cambios)


def _campos_mesa_con_error(**cambios) -> set[str]:
    with pytest.raises(ValidationError) as error:
        _mesa(**cambios)
    return {str(falla["loc"][0]) for falla in error.value.errors()}


# CA 1
def test_mesa_crear_acepta_datos_validos() -> None:
    datos = _mesa()

    assert datos.numero == 13
    assert datos.capacidad == 4
    assert datos.sector_id == 1


def test_mesa_crear_acepta_valores_sin_tope_superior() -> None:
    datos = _mesa(numero=1000, capacidad=500)

    assert datos.numero == 1000
    assert datos.capacidad == 500


# CA 5 y CA 6
@pytest.mark.parametrize(
    "campo, valor",
    [
        ("numero", 0),
        ("numero", -1),
        ("numero", "3"),
        ("numero", 2.0),
        ("numero", True),
        ("capacidad", 0),
        ("capacidad", -1),
        ("capacidad", "4"),
        ("capacidad", 2.0),
        ("capacidad", True),
    ],
    ids=[
        "numero-cero",
        "numero-negativo",
        "numero-texto",
        "numero-decimal",
        "numero-booleano",
        "capacidad-cero",
        "capacidad-negativa",
        "capacidad-texto",
        "capacidad-decimal",
        "capacidad-booleana",
    ],
)
def test_mesa_crear_rechaza_numero_y_capacidad_invalidos(campo: str, valor: object) -> None:
    assert _campos_mesa_con_error(**{campo: valor}) == {campo}


# CA 2
@pytest.mark.parametrize("campo", ["numero", "capacidad", "sector_id"])
def test_mesa_crear_exige_los_tres_campos(campo: str) -> None:
    cuerpo = {"numero": 13, "capacidad": 4, "sector_id": 1}
    del cuerpo[campo]

    with pytest.raises(ValidationError) as error:
        MesaCrear.model_validate(cuerpo)

    assert {str(falla["loc"][0]) for falla in error.value.errors()} == {campo}


@pytest.mark.parametrize("sector_id", [0, -1, "1", 1.0, True])
def test_mesa_crear_rechaza_sector_id_invalido(sector_id: object) -> None:
    assert _campos_mesa_con_error(sector_id=sector_id) == {"sector_id"}


# CA 7
@pytest.mark.parametrize("campo, valor", [("estado", "OCUPADA"), ("id", 1)])
def test_mesa_crear_rechaza_campos_desconocidos(campo: str, valor: object) -> None:
    assert _campos_mesa_con_error(**{campo: valor}) == {campo}


def test_mesa_salida_anida_el_sector_y_el_estado() -> None:
    salida = MesaSalida(
        id=1,
        numero=13,
        capacidad=4,
        sector=SectorResumen(id=2, nombre="Salón principal"),
        estado=EstadoMesa.LIBRE,
    )

    assert salida.model_dump(mode="json") == {
        "id": 1,
        "numero": 13,
        "capacidad": 4,
        "sector": {"id": 2, "nombre": "Salón principal"},
        "estado": "LIBRE",
    }
