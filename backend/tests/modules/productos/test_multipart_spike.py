"""Prueba temprana del contrato multipart (diseno B2 y B3): parte `datos` con JSON + `imagen`."""

import json
from typing import Annotated

import pytest
from fastapi import Depends, FastAPI, File, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.testclient import TestClient
from pydantic import BaseModel, ConfigDict

from app.main import manejar_datos_invalidos
from app.modules.productos.router import datos_de


class _Minimo(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: str
    ingredientes: list[str]


@pytest.fixture
def cliente_spike() -> TestClient:
    app = FastAPI()
    app.add_exception_handler(RequestValidationError, manejar_datos_invalidos)

    @app.post("/spike")
    def ruta(
        datos: Annotated[_Minimo, Depends(datos_de(_Minimo))],
        imagen: Annotated[UploadFile | None, File()] = None,
    ) -> dict:
        return {
            "nombre": datos.nombre,
            "ingredientes": datos.ingredientes,
            "imagen": None if imagen is None else imagen.file.read().decode(),
        }

    return TestClient(app)


def _datos(**campos) -> dict[str, str]:
    base = {"nombre": "Milanesa", "ingredientes": ["Carne"]}
    return {"datos": json.dumps(base | campos)}


def test_multipart_con_imagen_entrega_datos_y_archivo(cliente_spike: TestClient) -> None:
    respuesta = cliente_spike.post(
        "/spike", data=_datos(), files={"imagen": ("foto.jpg", b"contenido", "image/jpeg")}
    )

    assert respuesta.status_code == 200
    assert respuesta.json() == {
        "nombre": "Milanesa",
        "ingredientes": ["Carne"],
        "imagen": "contenido",
    }


def test_multipart_sin_imagen_entrega_none(cliente_spike: TestClient) -> None:
    respuesta = cliente_spike.post("/spike", data=_datos(nombre="Pizza"))

    assert respuesta.status_code == 200
    assert respuesta.json()["nombre"] == "Pizza"
    assert respuesta.json()["imagen"] is None


def test_multipart_con_parte_imagen_vacia_equivale_a_sin_imagen(
    cliente_spike: TestClient,
) -> None:
    respuesta = cliente_spike.post(
        "/spike", data=_datos(), files={"imagen": ("", b"", "application/octet-stream")}
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["imagen"] is None


def test_multipart_con_json_invalido_responde_422_con_detalle(cliente_spike: TestClient) -> None:
    respuesta = cliente_spike.post("/spike", data={"datos": "{no es json"})

    assert respuesta.status_code == 422
    assert respuesta.json()["detalle"].startswith("Datos invalidos. datos:")


def test_multipart_con_campo_extra_responde_422_indicando_el_campo(
    cliente_spike: TestClient,
) -> None:
    respuesta = cliente_spike.post("/spike", data=_datos(categoria="POSTRE"))

    assert respuesta.status_code == 422
    assert "categoria" in respuesta.json()["detalle"]


def test_multipart_con_campo_faltante_responde_422_indicando_el_campo(
    cliente_spike: TestClient,
) -> None:
    respuesta = cliente_spike.post("/spike", data={"datos": json.dumps({"nombre": "Pizza"})})

    assert respuesta.status_code == 422
    assert "ingredientes" in respuesta.json()["detalle"]


def test_multipart_sin_parte_datos_responde_422(cliente_spike: TestClient) -> None:
    respuesta = cliente_spike.post("/spike", files={"imagen": ("a.jpg", b"x", "image/jpeg")})

    assert respuesta.status_code == 422
    assert "datos" in respuesta.json()["detalle"]
