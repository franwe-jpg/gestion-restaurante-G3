"""Pruebas de la migración de clientes de M4."""

from collections.abc import Iterator
from pathlib import Path

import pytest
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError

from alembic import command
from app.config import get_settings
from app.database import crear_motor
from app.modules.atencion.models import Cliente

ALEMBIC_INI = Path(__file__).resolve().parents[3] / "alembic.ini"
REVISION_ANTERIOR = "d6b7c8e9f0a1"


@pytest.fixture
def base_temporal(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[tuple[str, Config]]:
    url = f"sqlite:///{tmp_path / 'clientes.db'}"
    monkeypatch.setenv("DATABASE_URL", url)
    get_settings.cache_clear()
    yield url, Config(str(ALEMBIC_INI))
    get_settings.cache_clear()


def _insertar_cliente(url: str, nombre: str | None, telefono: str | None) -> None:
    motor = crear_motor(url)
    try:
        with motor.begin() as conexion:
            conexion.execute(
                text("INSERT INTO clientes (nombre, telefono) VALUES (:nombre, :telefono)"),
                {"nombre": nombre, "telefono": telefono},
            )
    finally:
        motor.dispose()


def test_upgrade_crea_clientes_con_columnas_obligatorias(
    base_temporal: tuple[str, Config],
) -> None:
    url, config = base_temporal
    command.upgrade(config, "head")
    motor = crear_motor(url)
    try:
        inspector = inspect(motor)
        columnas = {columna["name"]: columna for columna in inspector.get_columns("clientes")}
        assert len(ScriptDirectory.from_config(config).get_heads()) == 1
        assert set(columnas) == {"id", "nombre", "telefono"}
        assert all(not columna["nullable"] for columna in columnas.values())
        assert columnas["id"]["primary_key"] == 1
        assert columnas["nombre"]["type"].python_type is str
        assert columnas["telefono"]["type"].python_type is str
    finally:
        motor.dispose()


def test_modelo_cliente_coincide_con_la_migracion(base_temporal: tuple[str, Config]) -> None:
    url, config = base_temporal
    command.upgrade(config, "head")
    motor = crear_motor(url)
    try:
        columnas = {columna["name"] for columna in inspect(motor).get_columns("clientes")}
        assert Cliente.__tablename__ == "clientes"
        assert set(Cliente.__table__.columns.keys()) == columnas
        assert Cliente.__table__.c.nombre.nullable is False
        assert Cliente.__table__.c.telefono.nullable is False
    finally:
        motor.dispose()


@pytest.mark.parametrize(
    ("nombre", "telefono"),
    [("Ana", "100"), ("Ana", "200"), ("Bea", "100")],
)
def test_upgrade_permite_nombres_y_telefonos_repetidos(
    base_temporal: tuple[str, Config], nombre: str, telefono: str
) -> None:
    url, config = base_temporal
    command.upgrade(config, "head")
    _insertar_cliente(url, "Ana", "100")
    _insertar_cliente(url, nombre, telefono)

    motor = crear_motor(url)
    try:
        with motor.connect() as conexion:
            total = conexion.scalar(text("SELECT count(*) FROM clientes"))
        assert total == 2
    finally:
        motor.dispose()


@pytest.mark.parametrize(
    ("nombre", "telefono"),
    [(None, "100"), ("Ana", None)],
    ids=["nombre-nulo", "telefono-nulo"],
)
def test_upgrade_rechaza_datos_nulos(
    base_temporal: tuple[str, Config], nombre: str | None, telefono: str | None
) -> None:
    url, config = base_temporal
    command.upgrade(config, "head")
    with pytest.raises(IntegrityError):
        _insertar_cliente(url, nombre, telefono)


def test_downgrade_elimina_clientes_y_conserva_tablas_previas(
    base_temporal: tuple[str, Config],
) -> None:
    url, config = base_temporal
    command.upgrade(config, "head")
    _insertar_cliente(url, "Ana", "100")
    command.downgrade(config, REVISION_ANTERIOR)
    motor = crear_motor(url)
    try:
        tablas = set(inspect(motor).get_table_names())
        assert "clientes" not in tablas
        assert {"menus_ejecutivos", "mesas", "productos", "alembic_version"} <= tablas
    finally:
        motor.dispose()

    command.upgrade(config, "head")
    motor = crear_motor(url)
    try:
        assert "clientes" in inspect(motor).get_table_names()
    finally:
        motor.dispose()
