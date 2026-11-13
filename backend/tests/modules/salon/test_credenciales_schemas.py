"""Esquemas de Mozo y Chef con credenciales (HU-TR-01, 5.1)."""

import pytest
from pydantic import ValidationError

from app.modules.salon.schemas import (
    ChefCrear,
    ChefModificar,
    ChefSalida,
    MozoCrear,
    MozoModificar,
    MozoSalida,
)
from app.shared.models import Estado

BASE = {"dni": "30123456", "nombre": "Juan", "apellido": "Fernández"}
CREDENCIALES = {"correo": "juan@resto.com", "contrasena": "Clave1234"}


@pytest.mark.parametrize("crear", [MozoCrear, ChefCrear])
@pytest.mark.parametrize("falta", ["correo", "contrasena"])
def test_alta_exige_correo_y_contrasena(crear: type, falta: str) -> None:
    datos = BASE | CREDENCIALES
    del datos[falta]

    with pytest.raises(ValidationError) as error:
        crear.model_validate(datos)

    assert {str(falla["loc"][0]) for falla in error.value.errors()} == {falta}


@pytest.mark.parametrize("crear", [MozoCrear, ChefCrear])
def test_alta_rechaza_contrasena_de_7_caracteres_y_correo_sin_formato(crear: type) -> None:
    for cambio in ({"contrasena": "1234567"}, {"correo": "sin-arroba"}):
        with pytest.raises(ValidationError):
            crear.model_validate(BASE | CREDENCIALES | cambio)


@pytest.mark.parametrize("crear", [MozoCrear, ChefCrear])
def test_alta_acepta_contrasena_de_8_caracteres_y_recorta_el_correo(crear: type) -> None:
    datos = crear.model_validate(BASE | {"correo": " juan@resto.com ", "contrasena": "12345678"})

    assert datos.correo == "juan@resto.com"
    assert datos.contrasena == "12345678"


@pytest.mark.parametrize("modificar", [MozoModificar, ChefModificar])
def test_modificacion_exige_correo(modificar: type) -> None:
    with pytest.raises(ValidationError) as error:
        modificar.model_validate(BASE)

    assert {str(falla["loc"][0]) for falla in error.value.errors()} == {"correo"}


@pytest.mark.parametrize("modificar", [MozoModificar, ChefModificar])
@pytest.mark.parametrize("contrasena", [None, ""])
def test_modificacion_acepta_contrasena_vacia_o_ausente(modificar: type, contrasena) -> None:
    datos = BASE | {"correo": "juan@resto.com"}
    if contrasena is not None:
        datos["contrasena"] = contrasena

    assert modificar.model_validate(datos).contrasena is None


@pytest.mark.parametrize("modificar", [MozoModificar, ChefModificar])
def test_modificacion_valida_la_contrasena_si_llega(modificar: type) -> None:
    with pytest.raises(ValidationError):
        modificar.model_validate(BASE | CREDENCIALES | {"contrasena": "corta"})


@pytest.mark.parametrize("clase", [MozoCrear, ChefCrear, MozoModificar, ChefModificar])
def test_estado_extra_es_invalido(clase: type) -> None:
    with pytest.raises(ValidationError):
        clase.model_validate(BASE | CREDENCIALES | {"estado": "HABILITADO"})


@pytest.mark.parametrize("salida", [MozoSalida, ChefSalida])
def test_salida_agrega_correo_y_no_trae_contrasena(salida: type) -> None:
    datos = salida(
        id=1,
        dni="30123456",
        nombre="Juan",
        apellido="Fernández",
        telefono=None,
        estado=Estado.HABILITADO,
        correo=None,
    )

    assert "correo" in salida.model_fields
    assert "contrasena" not in datos.model_dump()
    assert "contrasena_hash" not in datos.model_dump()
