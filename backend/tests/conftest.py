"""Fixtures compartidas: una base SQLite temporal por prueba, creada con las migraciones (D-14)."""

from collections.abc import Callable, Iterator
from datetime import datetime
from pathlib import Path

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from alembic import command
from app.config import get_settings
from app.database import crear_motor, get_db
from app.main import app
from app.modules.usuarios import service as usuarios_service
from app.modules.usuarios.models import Usuario
from app.shared.contratos.usuario import UsuarioSesion
from app.shared.models import Estado
from app.shared.models.enums import Rol
from app.shared.permisos import permisos_de
from app.shared.seguridad import usuario_actual

FabricaUsuario = Callable[..., Usuario]

ALEMBIC_INI = Path(__file__).resolve().parents[1] / "alembic.ini"


@pytest.fixture(autouse=True)
def _rondas_bcrypt_bajas(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    """El hash de las pruebas usa 4 rondas para no ralentizar la suite (A6)."""
    monkeypatch.setenv("BCRYPT_RONDAS", "4")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def db(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Session]:
    """Sesion sobre una base nueva, migrada hasta head."""
    url = f"sqlite:///{tmp_path / 'prueba.db'}"
    monkeypatch.setenv("DATABASE_URL", url)
    get_settings.cache_clear()
    command.upgrade(Config(str(ALEMBIC_INI)), "head")
    get_settings.cache_clear()

    motor = crear_motor(url)
    with sessionmaker(bind=motor, autoflush=False, expire_on_commit=False)() as sesion:
        yield sesion
    motor.dispose()


def _usuario_de_prueba(*roles: Rol) -> UsuarioSesion:
    permisos = sorted(permisos_de(roles))
    return UsuarioSesion(
        id=1,
        correo="prueba@resto.com",
        roles=list(roles),
        permisos=permisos,
        vence_en=datetime(2999, 1, 1),
    )


@pytest.fixture
def cliente(db: Session) -> Iterator[TestClient]:
    """Cliente HTTP con un encargado ya autenticado y la base de la prueba (A12)."""
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[usuario_actual] = lambda: _usuario_de_prueba(Rol.ENCARGADO)
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def cliente_con_rol(db: Session) -> Iterator[Callable[[Rol], TestClient]]:
    """Fabrica de clientes HTTP autenticados con los roles indicados."""
    app.dependency_overrides[get_db] = lambda: db

    def crear(*roles: Rol) -> TestClient:
        app.dependency_overrides[usuario_actual] = lambda: _usuario_de_prueba(*roles)
        return TestClient(app)

    yield crear
    app.dependency_overrides.clear()


@pytest.fixture
def cliente_sin_sesion(db: Session) -> Iterator[TestClient]:
    """Cliente HTTP con la seguridad real: sin encabezado la API responde 401."""
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def fabrica_usuario(db: Session) -> FabricaUsuario:
    """Crea usuarios con contrasena real (hash de 4 rondas) para probar el inicio de sesion."""

    def crear(
        correo: str = "ana@resto.com",
        contrasena: str = "Clave1234",
        rol: Rol = Rol.ENCARGADO,
        estado: Estado = Estado.HABILITADO,
    ) -> Usuario:
        usuario = usuarios_service.registrar_usuario(db, correo, contrasena, rol)
        usuario.estado = estado
        db.commit()
        return usuario

    return crear
