"""Pruebas de la migración de finalización de promociones (HU-M2-09)."""

from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import inspect

from alembic import command
from app.config import get_settings
from app.database import crear_motor

ALEMBIC_INI = Path(__file__).resolve().parents[3] / "alembic.ini"
REVISION = "b5d7f9a1c3e5"
REVISION_ANTERIOR = "a4c6e8b0d2f4"


def _preparar_base(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, nombre: str
) -> tuple[str, Config]:
    url = f"sqlite:///{tmp_path / nombre}"
    monkeypatch.setenv("DATABASE_URL", url)
    get_settings.cache_clear()
    return url, Config(str(ALEMBIC_INI))


def _columnas(url: str) -> dict[str, dict]:
    motor = crear_motor(url)
    columnas = {columna["name"]: columna for columna in inspect(motor).get_columns("promociones")}
    motor.dispose()
    return columnas


def test_upgrade_agrega_fecha_hora_finalizacion(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "finalizacion.db")

    command.upgrade(config, REVISION)
    columnas = _columnas(url)
    get_settings.cache_clear()

    assert "fecha_hora_finalizacion" in columnas
    assert columnas["fecha_hora_finalizacion"]["nullable"] is True


def test_downgrade_quita_fecha_hora_finalizacion(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "finalizacion-down.db")

    command.upgrade(config, REVISION)
    command.downgrade(config, REVISION_ANTERIOR)
    columnas = _columnas(url)
    get_settings.cache_clear()

    assert "fecha_hora_finalizacion" not in columnas
