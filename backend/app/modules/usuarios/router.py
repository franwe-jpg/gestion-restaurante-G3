"""usuarios: endpoints de sesion. Solo delega al service (D-02)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.usuarios import service
from app.modules.usuarios.schemas import SesionCrear, SesionSalida, UsuarioSalida
from app.shared.contratos.usuario import UsuarioSesion
from app.shared.excepciones import NoAutenticadoError
from app.shared.seguridad import MENSAJE_SESION_INVALIDA, esquema_bearer, usuario_actual

router = APIRouter(tags=["Sesión"])

Sesion = Annotated[Session, Depends(get_db)]
UsuarioActual = Annotated[UsuarioSesion, Depends(usuario_actual)]
Credenciales = Annotated[HTTPAuthorizationCredentials | None, Depends(esquema_bearer)]


@router.post("/sesion", status_code=status.HTTP_201_CREATED)
def iniciar_sesion(datos: SesionCrear, db: Sesion) -> SesionSalida:
    return service.iniciar_sesion(db, datos.correo, datos.contrasena)


@router.get("/sesion")
def consultar_sesion(usuario: UsuarioActual, db: Sesion) -> UsuarioSalida:
    return service.usuario_salida(db, usuario.id)


@router.delete("/sesion", status_code=status.HTTP_204_NO_CONTENT)
def cerrar_sesion(_usuario: UsuarioActual, credenciales: Credenciales, db: Sesion) -> Response:
    if credenciales is None:  # no ocurre con la seguridad real: usuario_actual ya respondio 401
        raise NoAutenticadoError(MENSAJE_SESION_INVALIDA)
    service.cerrar_sesion(db, credenciales.credentials)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
