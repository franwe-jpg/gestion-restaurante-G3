"""Excepciones 401 y 403 y sus manejadores (HU-TR-01, A10)."""

import json

from app.main import manejar_no_autenticado, manejar_sin_permiso
from app.shared.excepciones import NoAutenticadoError, SinPermisoError


def test_no_autenticado_responde_401_con_www_authenticate() -> None:
    respuesta = manejar_no_autenticado(None, NoAutenticadoError("Sesión no válida o vencida"))  # type: ignore[arg-type]

    assert respuesta.status_code == 401
    assert respuesta.headers["www-authenticate"] == "Bearer"
    assert json.loads(respuesta.body) == {"detalle": "Sesión no válida o vencida"}


def test_sin_permiso_responde_403_con_detalle() -> None:
    respuesta = manejar_sin_permiso(
        None, SinPermisoError("No tiene permiso para realizar esta acción")
    )  # type: ignore[arg-type]

    assert respuesta.status_code == 403
    assert json.loads(respuesta.body) == {"detalle": "No tiene permiso para realizar esta acción"}
