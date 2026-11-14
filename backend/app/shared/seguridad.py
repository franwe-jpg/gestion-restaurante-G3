"""Punto de enganche de la autenticacion (D-13): exige una sesion valida en cada endpoint."""

from typing import Annotated

from fastapi import Depends, params
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.usuarios import service as usuarios_service
from app.shared.contratos.usuario import UsuarioSesion
from app.shared.excepciones import NoAutenticadoError, SinPermisoError
from app.shared.permisos import Permiso

MENSAJE_SESION_INVALIDA = "Sesión no válida o vencida"
MENSAJE_SIN_PERMISO = "No tiene permiso para realizar esta acción"

# `auto_error=False`: un encabezado ausente o con otro esquema lo resolvemos con nuestro 401.
esquema_bearer = HTTPBearer(auto_error=False)


def usuario_actual(
    credenciales: Annotated[HTTPAuthorizationCredentials | None, Depends(esquema_bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> UsuarioSesion:
    """Resuelve el usuario del token Bearer o responde 401."""
    if credenciales is None:
        raise NoAutenticadoError(MENSAJE_SESION_INVALIDA)
    usuario = usuarios_service.usuario_de_token(db, credenciales.credentials)
    if usuario is None:
        raise NoAutenticadoError(MENSAJE_SESION_INVALIDA)
    return usuario


def requiere(permiso: Permiso) -> params.Depends:
    """Dependencia de router: exige sesion y el permiso, antes de validar el cuerpo (A4).

    El verificador expone `.permiso` para el test de completitud de la matriz.
    """

    def verificador(usuario: Annotated[UsuarioSesion, Depends(usuario_actual)]) -> UsuarioSesion:
        if permiso not in usuario.permisos:
            raise SinPermisoError(MENSAJE_SIN_PERMISO)
        return usuario

    verificador.permiso = permiso  # type: ignore[attr-defined]
    return Depends(verificador)
