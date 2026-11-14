"""Contrato del usuario autenticado que comparten seguridad y el router de sesion."""

from datetime import datetime

from pydantic import BaseModel

from app.shared.models.enums import Rol
from app.shared.permisos import Permiso


class UsuarioSesion(BaseModel):
    id: int
    correo: str
    roles: list[Rol]
    permisos: list[Permiso]
    vence_en: datetime
