"""Tipos de correo y contrasena compartidos (HU-TR-01, S2)."""

import pytest
from pydantic import TypeAdapter, ValidationError

from app.shared.credenciales import ContrasenaNueva, Correo

correo = TypeAdapter(Correo)
contrasena = TypeAdapter(ContrasenaNueva)


def test_correo_se_recorta() -> None:
    assert correo.validate_python("  ana@resto.com  ") == "ana@resto.com"


def test_correo_de_254_caracteres_es_valido() -> None:
    texto = "a" * (254 - len("@r.com")) + "@r.com"

    assert correo.validate_python(texto) == texto


def test_correo_de_255_caracteres_es_invalido() -> None:
    with pytest.raises(ValidationError):
        correo.validate_python("a" * (255 - len("@r.com")) + "@r.com")


@pytest.mark.parametrize(
    "texto", ["", "   ", "sin-arroba", "a@b", "a b@c.com", "@c.com", "a@@c.com"]
)
def test_correo_con_formato_invalido(texto: str) -> None:
    with pytest.raises(ValidationError):
        correo.validate_python(texto)


def test_contrasena_de_7_caracteres_es_invalida() -> None:
    with pytest.raises(ValidationError):
        contrasena.validate_python("1234567")


def test_contrasena_de_8_caracteres_es_valida() -> None:
    assert contrasena.validate_python("12345678") == "12345678"


def test_contrasena_de_72_bytes_es_valida() -> None:
    assert contrasena.validate_python("a" * 72) == "a" * 72


def test_contrasena_de_73_bytes_es_invalida() -> None:
    with pytest.raises(ValidationError):
        contrasena.validate_python("a" * 73)


def test_contrasena_multibyte_cuenta_bytes_no_caracteres() -> None:
    # 36 caracteres de 2 bytes = 72 bytes (valida); 37 = 74 bytes (invalida).
    assert contrasena.validate_python("ñ" * 36) == "ñ" * 36
    with pytest.raises(ValidationError):
        contrasena.validate_python("ñ" * 37)


def test_contrasena_no_se_recorta() -> None:
    assert contrasena.validate_python("  abcdef  ") == "  abcdef  "
