from pathlib import Path

from alembic.config import Config
from sqlalchemy import inspect, text

from alembic import command
from app.config import get_settings
from app.database import crear_motor

ALEMBIC_INI = Path(__file__).resolve().parents[1] / "alembic.ini"


def test_sqlite_usa_wal_busy_timeout_y_claves_foraneas(tmp_path: Path) -> None:
    motor = crear_motor(f"sqlite:///{tmp_path / 'prueba.db'}")

    with motor.connect() as conexion:
        modo = conexion.execute(text("PRAGMA journal_mode")).scalar()
        espera = conexion.execute(text("PRAGMA busy_timeout")).scalar()
        claves = conexion.execute(text("PRAGMA foreign_keys")).scalar()
    motor.dispose()

    assert modo == "wal"
    assert espera == 5000
    assert claves == 1


def test_migraciones_crean_la_base_desde_cero(tmp_path: Path, monkeypatch) -> None:
    url = f"sqlite:///{tmp_path / 'migrada.db'}"
    monkeypatch.setenv("DATABASE_URL", url)
    get_settings.cache_clear()

    command.upgrade(Config(str(ALEMBIC_INI)), "head")

    motor = crear_motor(url)
    tablas = inspect(motor).get_table_names()
    motor.dispose()
    get_settings.cache_clear()

    assert "alembic_version" in tablas
