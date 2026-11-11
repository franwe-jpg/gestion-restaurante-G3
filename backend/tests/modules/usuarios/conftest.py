"""Fabricas de datos para las pruebas del modulo usuarios."""

from collections.abc import Callable

import pytest
from sqlalchemy.orm import Session

from app.modules.usuarios import service
from app.modules.usuarios.models import Usuario
from app.shared.models import Estado
from app.shared.models.enums import Rol

FabricaUsuario = Callable[..., Usuario]


@pytest.fixture
def fabrica_usuario(db: Session) -> FabricaUsuario:
    def crear(
        correo: str = "ana@resto.com",
        contrasena: str = "Clave1234",
        rol: Rol = Rol.ENCARGADO,
        estado: Estado = Estado.HABILITADO,
    ) -> Usuario:
        usuario = service.registrar_usuario(db, correo, contrasena, rol)
        usuario.estado = estado
        db.commit()
        return usuario

    return crear
