"""Dependencias de seguridad en una app aislada (HU-TR-01, P2)."""

from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.testclient import TestClient
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.main import manejar_datos_invalidos, manejar_no_autenticado, manejar_sin_permiso
from app.modules.usuarios import service
from app.shared.excepciones import NoAutenticadoError, SinPermisoError
from app.shared.models.enums import Rol
from app.shared.permisos import Permiso
from app.shared.seguridad import requiere
from tests.conftest import FabricaUsuario


class Cuerpo(BaseModel):
    numero: int


@pytest.fixture
def cliente_aislado(db: Session) -> Iterator[TestClient]:
    aplicacion = FastAPI()
    aplicacion.add_exception_handler(NoAutenticadoError, manejar_no_autenticado)
    aplicacion.add_exception_handler(SinPermisoError, manejar_sin_permiso)
    aplicacion.add_exception_handler(RequestValidationError, manejar_datos_invalidos)
    aplicacion.dependency_overrides[get_db] = lambda: db

    @aplicacion.get("/carta", dependencies=[requiere(Permiso.CARTA_VER)])
    def ver_carta() -> dict[str, str]:
        return {"ok": "carta"}

    @aplicacion.post("/platos", dependencies=[requiere(Permiso.CARTA_GESTIONAR)])
    def crear_plato(cuerpo: Cuerpo) -> dict[str, int]:
        return {"numero": cuerpo.numero}

    yield TestClient(aplicacion)


def _token(db: Session, fabrica: FabricaUsuario, correo: str, rol: Rol) -> dict[str, str]:
    fabrica(correo=correo, rol=rol)
    token = service.iniciar_sesion(db, correo, "Clave1234").token
    return {"Authorization": f"Bearer {token}"}


def test_sin_encabezado_responde_401_con_www_authenticate(cliente_aislado: TestClient) -> None:
    respuesta = cliente_aislado.get("/carta")

    assert respuesta.status_code == 401
    assert respuesta.headers["www-authenticate"] == "Bearer"
    assert respuesta.json() == {"detalle": "Sesión no válida o vencida"}


def test_esquema_distinto_de_bearer_responde_401(cliente_aislado: TestClient) -> None:
    respuesta = cliente_aislado.get("/carta", headers={"Authorization": "Basic YWJjOmRlZg=="})

    assert respuesta.status_code == 401
    assert respuesta.json() == {"detalle": "Sesión no válida o vencida"}


def test_token_desconocido_responde_401(cliente_aislado: TestClient) -> None:
    respuesta = cliente_aislado.get("/carta", headers={"Authorization": "Bearer abc"})

    assert respuesta.status_code == 401
    assert respuesta.headers["www-authenticate"] == "Bearer"


def test_con_el_permiso_pasa_a_la_logica_del_endpoint(
    cliente_aislado: TestClient, db: Session, fabrica_usuario: FabricaUsuario
) -> None:
    cabecera = _token(db, fabrica_usuario, "chef@resto.com", Rol.CHEF)

    respuesta = cliente_aislado.get("/carta", headers=cabecera)

    assert respuesta.status_code == 200


def test_sin_el_permiso_responde_403_sin_revelar_cual_falto(
    cliente_aislado: TestClient, db: Session, fabrica_usuario: FabricaUsuario
) -> None:
    cabecera = _token(db, fabrica_usuario, "mozo@resto.com", Rol.MOZO)

    respuesta = cliente_aislado.post("/platos", json={"numero": 1}, headers=cabecera)

    assert respuesta.status_code == 403
    assert respuesta.json() == {"detalle": "No tiene permiso para realizar esta acción"}


def test_prohibido_responde_403_antes_que_el_422_del_cuerpo(
    cliente_aislado: TestClient, db: Session, fabrica_usuario: FabricaUsuario
) -> None:
    cabecera = _token(db, fabrica_usuario, "mozo@resto.com", Rol.MOZO)

    respuesta = cliente_aislado.post(
        "/platos", json={"numero": "no-es-un-entero"}, headers=cabecera
    )

    assert respuesta.status_code == 403


def test_permitido_con_cuerpo_invalido_responde_422(
    cliente_aislado: TestClient, db: Session, fabrica_usuario: FabricaUsuario
) -> None:
    cabecera = _token(db, fabrica_usuario, "jefe@resto.com", Rol.ENCARGADO)

    respuesta = cliente_aislado.post("/platos", json={"numero": "x"}, headers=cabecera)

    assert respuesta.status_code == 422


def test_varios_roles_suman_sus_permisos(
    cliente_aislado: TestClient, db: Session, fabrica_usuario: FabricaUsuario
) -> None:
    from sqlalchemy import insert

    from app.modules.usuarios.models import UsuarioRol

    usuario = fabrica_usuario(correo="doble@resto.com", rol=Rol.CHEF)
    db.execute(insert(UsuarioRol).values(usuario_id=usuario.id, rol=Rol.ENCARGADO))
    db.commit()
    token = service.iniciar_sesion(db, "doble@resto.com", "Clave1234").token

    respuesta = cliente_aislado.post(
        "/platos", json={"numero": 1}, headers={"Authorization": f"Bearer {token}"}
    )

    assert respuesta.status_code == 200


def test_el_verificador_expone_el_permiso() -> None:
    assert requiere(Permiso.REPORTES_VER).dependency.permiso == Permiso.REPORTES_VER  # type: ignore[union-attr]
