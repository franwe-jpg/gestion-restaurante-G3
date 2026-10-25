from pathlib import Path

from alembic.config import Config
from sqlalchemy import inspect

from alembic import command
from app.config import get_settings
from app.database import crear_motor

ALEMBIC_INI = Path(__file__).resolve().parents[3] / "alembic.ini"


def _tablas(url: str) -> list[str]:
    motor = crear_motor(url)
    tablas = inspect(motor).get_table_names()
    motor.dispose()
    return tablas


def test_upgrade_crea_secciones_y_productos(tmp_path: Path, monkeypatch) -> None:
    url = f"sqlite:///{tmp_path / 'migrada.db'}"
    monkeypatch.setenv("DATABASE_URL", url)
    get_settings.cache_clear()

    command.upgrade(Config(str(ALEMBIC_INI)), "head")
    tablas = _tablas(url)
    get_settings.cache_clear()

    assert "secciones" in tablas
    assert "productos" in tablas


def test_downgrade_elimina_productos_y_secciones(tmp_path: Path, monkeypatch) -> None:
    url = f"sqlite:///{tmp_path / 'revertida.db'}"
    monkeypatch.setenv("DATABASE_URL", url)
    get_settings.cache_clear()
    config = Config(str(ALEMBIC_INI))

    command.upgrade(config, "head")
    command.downgrade(config, "-1")
    tablas = _tablas(url)
    get_settings.cache_clear()

    assert "secciones" not in tablas
    assert "productos" not in tablas
    assert "alembic_version" in tablas
