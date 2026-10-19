from fastapi.testclient import TestClient

from app.main import app
from app.shared.excepciones import NoEncontradoError, ReglaDeNegocioError

cliente = TestClient(app)


@app.get("/_prueba/no-encontrado")
def _no_encontrado() -> None:
    raise NoEncontradoError("La mesa 7 no existe")


@app.get("/_prueba/regla-de-negocio")
def _regla_de_negocio() -> None:
    raise ReglaDeNegocioError("La comanda ya esta cerrada")


def test_salud_responde_ok() -> None:
    respuesta = cliente.get("/api/v1/salud")

    assert respuesta.status_code == 200
    assert respuesta.json() == {"estado": "ok"}


def test_no_encontrado_devuelve_404_con_detalle() -> None:
    respuesta = cliente.get("/_prueba/no-encontrado")

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detalle": "La mesa 7 no existe"}


def test_regla_de_negocio_devuelve_409_con_detalle() -> None:
    respuesta = cliente.get("/_prueba/regla-de-negocio")

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": "La comanda ya esta cerrada"}


def test_cors_rechaza_origen_no_configurado() -> None:
    respuesta = cliente.get("/api/v1/salud", headers={"Origin": "http://sitio-ajeno.com"})

    assert "access-control-allow-origin" not in respuesta.headers
