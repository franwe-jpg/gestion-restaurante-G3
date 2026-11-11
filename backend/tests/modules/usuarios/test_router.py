"""Endpoints /sesion (HU-TR-01, P1). Se usa el cliente sin sesion: la API es la real."""

from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.salon.models import Chef, Mozo
from app.modules.usuarios.models import Sesion
from app.shared.models.enums import Rol
from tests.modules.usuarios.conftest import FabricaUsuario

RUTA = "/api/v1/sesion"
CREDENCIALES = {"correo": "ana@resto.com", "contrasena": "Clave1234"}


def _entrar(cliente: TestClient) -> str:
    return cliente.post(RUTA, json=CREDENCIALES).json()["token"]


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_post_sesion_responde_201_con_token_vencimiento_y_usuario(
    cliente_sin_sesion: TestClient, fabrica_usuario: FabricaUsuario
) -> None:
    fabrica_usuario()

    respuesta = cliente_sin_sesion.post(RUTA, json=CREDENCIALES)

    assert respuesta.status_code == 201
    cuerpo = respuesta.json()
    assert set(cuerpo) == {"token", "tipo", "vence_en", "usuario"}
    assert cuerpo["tipo"] == "bearer"
    assert cuerpo["usuario"] == {
        "id": 1,
        "correo": "ana@resto.com",
        "roles": ["ENCARGADO"],
        "nombre": None,
        "apellido": None,
    }


def test_post_sesion_con_clave_incorrecta_responde_401_generico(
    cliente_sin_sesion: TestClient, fabrica_usuario: FabricaUsuario
) -> None:
    fabrica_usuario()

    respuesta = cliente_sin_sesion.post(RUTA, json={**CREDENCIALES, "contrasena": "otra-clave"})

    assert respuesta.status_code == 401
    assert respuesta.json() == {"detalle": "Correo o contraseña incorrectos"}
    assert respuesta.headers["www-authenticate"] == "Bearer"


@pytest.mark.parametrize(
    "cuerpo",
    [
        {"correo": "", "contrasena": "Clave1234"},
        {"correo": "sin-arroba", "contrasena": "Clave1234"},
        {"correo": "ana@resto.com", "contrasena": ""},
        {"correo": "ana@resto.com", "contrasena": "Clave1234", "extra": 1},
    ],
)
def test_post_sesion_con_datos_invalidos_responde_422(
    cliente_sin_sesion: TestClient, cuerpo: dict[str, object]
) -> None:
    assert cliente_sin_sesion.post(RUTA, json=cuerpo).status_code == 422


def test_get_sesion_devuelve_nombre_y_apellido_del_mozo_vinculado(
    cliente_sin_sesion: TestClient, db: Session, fabrica_usuario: FabricaUsuario
) -> None:
    usuario = fabrica_usuario(rol=Rol.MOZO)
    db.add(Mozo(dni="30123456", nombre="Ana", apellido="Paz", usuario_id=usuario.id))
    db.commit()
    token = _entrar(cliente_sin_sesion)

    respuesta = cliente_sin_sesion.get(RUTA, headers=_bearer(token))

    assert respuesta.status_code == 200
    assert respuesta.json() == {
        "id": usuario.id,
        "correo": "ana@resto.com",
        "roles": ["MOZO"],
        "nombre": "Ana",
        "apellido": "Paz",
    }


def test_get_sesion_devuelve_nombre_y_apellido_del_chef_vinculado(
    cliente_sin_sesion: TestClient, db: Session, fabrica_usuario: FabricaUsuario
) -> None:
    usuario = fabrica_usuario(rol=Rol.CHEF)
    db.add(Chef(dni="30123457", nombre="Luis", apellido="Gil", usuario_id=usuario.id))
    db.commit()
    token = _entrar(cliente_sin_sesion)

    cuerpo = cliente_sin_sesion.get(RUTA, headers=_bearer(token)).json()

    assert (cuerpo["nombre"], cuerpo["apellido"]) == ("Luis", "Gil")


def test_get_sesion_del_encargado_trae_nombre_y_apellido_nulos(
    cliente_sin_sesion: TestClient, fabrica_usuario: FabricaUsuario
) -> None:
    fabrica_usuario()
    token = _entrar(cliente_sin_sesion)

    cuerpo = cliente_sin_sesion.get(RUTA, headers=_bearer(token)).json()

    assert cuerpo["nombre"] is None
    assert cuerpo["apellido"] is None


def test_get_sesion_sin_token_responde_401(cliente_sin_sesion: TestClient) -> None:
    respuesta = cliente_sin_sesion.get(RUTA)

    assert respuesta.status_code == 401
    assert respuesta.json() == {"detalle": "Sesión no válida o vencida"}


def test_get_sesion_vencida_responde_401(
    cliente_sin_sesion: TestClient, db: Session, fabrica_usuario: FabricaUsuario
) -> None:
    fabrica_usuario()
    token = _entrar(cliente_sin_sesion)
    sesion = db.query(Sesion).one()
    sesion.vence_en = sesion.creada_en - timedelta(seconds=1)
    db.commit()

    assert cliente_sin_sesion.get(RUTA, headers=_bearer(token)).status_code == 401


def test_delete_sesion_responde_204_y_el_token_deja_de_valer(
    cliente_sin_sesion: TestClient, fabrica_usuario: FabricaUsuario
) -> None:
    fabrica_usuario()
    token = _entrar(cliente_sin_sesion)

    respuesta = cliente_sin_sesion.delete(RUTA, headers=_bearer(token))

    assert respuesta.status_code == 204
    assert cliente_sin_sesion.get(RUTA, headers=_bearer(token)).status_code == 401
    assert cliente_sin_sesion.delete(RUTA, headers=_bearer(token)).status_code == 401


def test_delete_sesion_sin_token_responde_401(cliente_sin_sesion: TestClient) -> None:
    assert cliente_sin_sesion.delete(RUTA).status_code == 401


def test_ninguna_respuesta_expone_la_contrasena(
    cliente_sin_sesion: TestClient, fabrica_usuario: FabricaUsuario
) -> None:
    fabrica_usuario()
    inicio = cliente_sin_sesion.post(RUTA, json=CREDENCIALES)
    consulta = cliente_sin_sesion.get(RUTA, headers=_bearer(inicio.json()["token"]))

    for respuesta in (inicio, consulta):
        assert "contrasena" not in respuesta.text
        assert "$2" not in respuesta.text
