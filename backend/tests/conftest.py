"""Fixtures compartidas: una base SQLite temporal por prueba, creada con las migraciones (D-14)."""

from collections.abc import Iterator
from pathlib import Path

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from alembic import command
from app.config import get_settings
from app.database import crear_motor, get_db
from app.main import app

ALEMBIC_INI = Path(__file__).resolve().parents[1] / "alembic.ini"


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


@pytest.fixture
def cliente(db: Session) -> Iterator[TestClient]:
    """Cliente HTTP que usa la sesion de la prueba en lugar de la base real."""
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()
