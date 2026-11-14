"""usuarios: entrada y salida de la API. Nunca incluyen la contrasena ni su hash."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.shared.credenciales import Correo
from app.shared.models.enums import Rol


class SesionCrear(BaseModel):
    model_config = ConfigDict(extra="forbid")

    correo: Correo
    # Sin limites de largo: una clave incorrecta responde 401, no 422 (el mensaje no filtra reglas).
    contrasena: str = Field(min_length=1)


class UsuarioSalida(BaseModel):
    id: int
    correo: str
    roles: list[Rol]
    nombre: str | None
    apellido: str | None


class SesionSalida(BaseModel):
    token: str
    tipo: Literal["bearer"] = "bearer"
    vence_en: datetime
    usuario: UsuarioSalida
