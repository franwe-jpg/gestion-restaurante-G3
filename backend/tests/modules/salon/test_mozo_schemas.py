"""Pruebas de los esquemas de mozo (HU-M3-09 y HU-M3-10)."""

import pytest
from pydantic import ValidationError

from app.modules.salon.schemas import MozoCrear, MozoModificar, MozoSalida
from app.shared.models import Estado


def _mozo(**cambios) -> MozoCrear:
    return MozoCrear.model_validate(
        {
            "dni": "30123456",
            "nombre": "Juan",
            "apellido": "Fernández",
            "telefono": "280 412-3456",
        }
        | cambios
    )


def _campos_con_error(**cambios) -> set[str]:
    with pytest.raises(ValidationError) as error:
        _mozo(**cambios)
    return {str(falla["loc"][0]) for falla in error.value.errors()}


# CA 1 de #43
def test_alta_acepta_los_datos_validos() -> None:
    datos = _mozo()

    assert datos.dni == "30123456"
    assert datos.nombre == "Juan"
    assert datos.apellido == "Fernández"
    assert datos.telefono == "280 412-3456"


# CA 5 de #43
@pytest.mark.parametrize("dni", ["7123456", "30123456"])
def test_dni_de_7_u_8_digitos_es_valido(dni: str) -> None:
    assert _mozo(dni=dni).dni == dni


@pytest.mark.parametrize(
    "dni",
    ["", "301234", "301234567", "3012345a", "30.123.456", "abcdefgh"],
    ids=["vacio", "seis-digitos", "nueve-digitos", "letra", "con-puntos", "solo-letras"],
)
def test_dni_invalido_es_rechazado(dni: str) -> None:
    assert _campos_con_error(dni=dni) == {"dni"}


def test_dni_se_recorta_y_acepta_7_u_8_digitos() -> None:
    assert _mozo(dni=" 7123456 ").dni == "7123456"
    assert _mozo(dni="30123456").dni == "30123456"


# CA 6 de #43
@pytest.mark.parametrize(
    "campo, valor",
    [
        ("nombre", "Juan123"),
        ("nombre", "Juan!"),
        ("nombre", ""),
        ("apellido", "Fernández2"),
        ("apellido", "Fernández@"),
        ("apellido", ""),
    ],
    ids=[
        "nombre-numeros",
        "nombre-especial",
        "nombre-vacio",
        "apellido-numeros",
        "apellido-especial",
        "apellido-vacio",
    ],
)
def test_nombre_y_apellido_solo_admiten_letras(campo: str, valor: str) -> None:
    assert _campos_con_error(**{campo: valor}) == {campo}


@pytest.mark.parametrize("campo", ["nombre", "apellido"])
def test_nombre_y_apellido_recortan_y_admiten_espacios(campo: str) -> None:
    assert getattr(_mozo(**{campo: "  María José  "}), campo) == "María José"


# Teléfono opcional
@pytest.mark.parametrize("telefono", [None, "", "   "])
def test_telefono_vacio_se_guarda_como_none(telefono: str | None) -> None:
    assert _mozo(telefono=telefono).telefono is None


def test_telefono_se_recorta_y_es_opcional() -> None:
    assert _mozo(telefono="  280 412-3456  ").telefono == "280 412-3456"
    assert _mozo(telefono=None).telefono is None


def test_telefono_de_30_caracteres_es_valido_y_31_no() -> None:
    assert _mozo(telefono="a" * 30).telefono == "a" * 30
    assert _campos_con_error(telefono="a" * 31) == {"telefono"}


# CA 7 de #43: el estado lo asigna el sistema
@pytest.mark.parametrize("campo, valor", [("estado", "DESHABILITADO"), ("id", 1)])
def test_campos_desconocidos_se_rechazan(campo: str, valor: object) -> None:
    assert _campos_con_error(**{campo: valor}) == {campo}


def test_mozo_modificar_hereda_las_reglas_del_alta() -> None:
    assert issubclass(MozoModificar, MozoCrear)
    assert set(MozoModificar.model_fields) == {"dni", "nombre", "apellido", "telefono"}


def test_mozo_salida_expone_todos_los_datos() -> None:
    salida = MozoSalida(
        id=1,
        dni="30123456",
        nombre="Juan",
        apellido="Fernández",
        telefono=None,
        estado=Estado.HABILITADO,
    )

    assert salida.model_dump(mode="json") == {
        "id": 1,
        "dni": "30123456",
        "nombre": "Juan",
        "apellido": "Fernández",
        "telefono": None,
        "estado": "HABILITADO",
    }
