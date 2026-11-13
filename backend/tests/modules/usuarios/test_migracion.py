"""Migracion de usuarios, usuario_roles, sesiones y chefs (HU-TR-01, P6)."""

from pathlib import Path

import pytest
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import inspect, text

from alembic import command
from app.config import get_settings
from app.database import crear_motor

ALEMBIC_INI = Path(__file__).resolve().parents[3] / "alembic.ini"
REVISION_ANTERIOR = "c3e5a7b9d1f2"
TABLAS_NUEVAS = {"usuarios", "usuario_roles", "sesiones", "chefs"}


def _preparar(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> tuple[str, Config]:
    url = f"sqlite:///{tmp_path / 'usuarios.db'}"
    monkeypatch.setenv("DATABASE_URL", url)
    get_settings.cache_clear()
    return url, Config(str(ALEMBIC_INI))


def _inspeccionar(url: str) -> tuple[set[str], set[str], set[str]]:
    motor = crear_motor(url)
    inspector = inspect(motor)
    tablas = set(inspector.get_table_names())
    columnas_mozos = {c["name"] for c in inspector.get_columns("mozos")}
    indices_mozos = {i["name"] for i in inspector.get_indexes("mozos")}
    motor.dispose()
    return tablas, columnas_mozos, indices_mozos


def test_upgrade_head_crea_las_tablas_y_la_columna_de_mozos(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar(tmp_path, monkeypatch)

    command.upgrade(config, "head")
    tablas, columnas_mozos, indices_mozos = _inspeccionar(url)
    get_settings.cache_clear()

    assert tablas >= TABLAS_NUEVAS
    assert "usuario_id" in columnas_mozos
    assert "ux_mozos_usuario_id" in indices_mozos


def test_upgrade_head_define_los_vinculos_unicos_de_chefs(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar(tmp_path, monkeypatch)

    command.upgrade(config, "head")
    motor = crear_motor(url)
    inspector = inspect(motor)
    indices = {i["name"] for i in inspector.get_indexes("chefs")}
    restricciones = {u["name"] for u in inspector.get_unique_constraints("chefs")}
    motor.dispose()
    get_settings.cache_clear()

    assert "ux_chefs_usuario_id" in indices
    assert "ux_chefs_dni" in restricciones


def test_downgrade_quita_lo_nuevo_y_conserva_los_datos_de_mozos(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar(tmp_path, monkeypatch)
    command.upgrade(config, "head")
    motor = crear_motor(url)
    with motor.begin() as conexion:
        conexion.execute(
            text(
                "INSERT INTO mozos (dni, nombre, apellido, estado) "
                "VALUES ('30123456', 'Juan', 'Perez', 'HABILITADO')"
            )
        )
    motor.dispose()

    command.downgrade(config, REVISION_ANTERIOR)
    tablas, columnas_mozos, _indices = _inspeccionar(url)
    motor = crear_motor(url)
    with motor.connect() as conexion:
        dni = conexion.execute(text("SELECT dni FROM mozos")).scalar_one()
    motor.dispose()
    get_settings.cache_clear()

    assert not TABLAS_NUEVAS & tablas
    assert "usuario_id" not in columnas_mozos
    assert dni == "30123456"


def test_hay_una_sola_cabeza(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    _url, config = _preparar(tmp_path, monkeypatch)

    cabezas = ScriptDirectory.from_config(config).get_heads()
    get_settings.cache_clear()

    assert len(cabezas) == 1
