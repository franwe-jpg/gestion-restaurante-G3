"""Tipos de correo y contrasena compartidos por usuarios y salon (S2)."""

from typing import Annotated

from pydantic import AfterValidator, StringConstraints

CORREO_MAXIMO = 254
CONTRASENA_MINIMA_BYTES = 8
CONTRASENA_MAXIMA_BYTES = 72  # limite de bcrypt
CORREO_PATRON = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


def _validar_contrasena(contrasena: str) -> str:
    largo = len(contrasena.encode("utf-8"))
    if not CONTRASENA_MINIMA_BYTES <= largo <= CONTRASENA_MAXIMA_BYTES:
        raise ValueError(
            f"La contraseña debe tener entre {CONTRASENA_MINIMA_BYTES} y "
            f"{CONTRASENA_MAXIMA_BYTES} bytes"
        )
    return contrasena


Correo = Annotated[
    str,
    StringConstraints(strip_whitespace=True, max_length=CORREO_MAXIMO, pattern=CORREO_PATRON),
]
ContrasenaNueva = Annotated[str, AfterValidator(_validar_contrasena)]
