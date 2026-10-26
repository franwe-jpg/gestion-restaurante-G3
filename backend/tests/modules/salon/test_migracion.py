"""Pruebas de la migracion de la tabla sectores (HU-M3-01)."""

from pathlib import Path

import pytest
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError

from alembic import command
from app.config import get_settings
from app.database import crear_motor

ALEMBIC_INI = Path(__file__).resolve().parents[3] / "alembic.ini"
INDICE_UNICO = "ux_sectores_nombre_normalizado"


def _preparar_base(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, nombre: str
) -> tuple[str, Config]:
    url = f"sqlite:///{tmp_path / nombre}"
    monkeypatch.setenv("DATABASE_URL", url)
    get_settings.cache_clear()
    return url, Config(str(ALEMBIC_INI))


def _inspeccionar(url: str) -> tuple[set[str], dict[str, dict], list[dict]]:
    motor = crear_motor(url)
    inspector = inspect(motor)
    tablas = set(inspector.get_table_names())
    columnas = (
        {columna["name"]: columna for columna in inspector.get_columns("sectores")}
        if "sectores" in tablas
        else {}
    )
    indices = inspector.get_indexes("sectores") if "sectores" in tablas else []
    motor.dispose()
    return tablas, columnas, indices


def _insertar_sector(url: str, nombre: str, normalizado: str) -> None:
    motor = crear_motor(url)
    with motor.begin() as conexion:
        conexion.execute(
            text(
                "INSERT INTO sectores (nombre, nombre_normalizado, descripcion, estado) "
                "VALUES (:nombre, :normalizado, NULL, 'HABILITADO')"
            ),
            {"nombre": nombre, "normalizado": normalizado},
        )
    motor.dispose()


def test_upgrade_head_crea_una_sola_cabeza_y_la_tabla_sectores(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "sectores.db")

    command.upgrade(config, "head")
    tablas, _columnas, _indices = _inspeccionar(url)
    cabezas = ScriptDirectory.from_config(config).get_heads()
    get_settings.cache_clear()

    assert len(cabezas) == 1
    assert "sectores" in tablas


def test_upgrade_define_columnas_y_largos(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "columnas.db")

    command.upgrade(config, "head")
    _tablas, columnas, _indices = _inspeccionar(url)
    get_settings.cache_clear()

    assert set(columnas) == {"id", "nombre", "nombre_normalizado", "descripcion", "estado"}
    assert columnas["nombre"]["type"].length == 30
    assert columnas["descripcion"]["type"].length == 200
    assert columnas["descripcion"]["nullable"] is True
    assert columnas["nombre_normalizado"]["nullable"] is False
    assert columnas["estado"]["nullable"] is False


def test_upgrade_crea_el_indice_unico_del_nombre_normalizado(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "indice.db")

    command.upgrade(config, "head")
    _tablas, _columnas, indices = _inspeccionar(url)
    get_settings.cache_clear()

    indice = next(indice for indice in indices if indice["name"] == INDICE_UNICO)
    assert indice["unique"]
    assert indice["column_names"] == ["nombre_normalizado"]


def test_upgrade_impone_la_unicidad_del_nombre_normalizado(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "unicidad.db")
    command.upgrade(config, "head")
    _insertar_sector(url, "Salón principal", "salón principal")

    with pytest.raises(IntegrityError):
        _insertar_sector(url, " salón PRINCIPAL ", "salón principal")
    get_settings.cache_clear()


def test_downgrade_de_un_paso_elimina_sectores_y_conserva_las_tablas_de_m1(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "baja.db")
    command.upgrade(config, "head")

    command.downgrade(config, "-1")
    tablas, _columnas, _indices = _inspeccionar(url)
    get_settings.cache_clear()

    assert "sectores" not in tablas
    assert "secciones" in tablas
    assert "productos" in tablas
    assert "alembic_version" in tablas
