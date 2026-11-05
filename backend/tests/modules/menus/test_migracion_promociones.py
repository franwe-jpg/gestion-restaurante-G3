"""Pruebas de la migración de promociones (HU-M2-07)."""

from pathlib import Path

import pytest
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import inspect, text

from alembic import command
from app.config import get_settings
from app.database import crear_motor

ALEMBIC_INI = Path(__file__).resolve().parents[3] / "alembic.ini"
REVISION = "a4c6e8b0d2f4"
REVISION_ANTERIOR = "d6f8a0c2e4b6"
INDICE_UNICO = "ux_promociones_nombre_normalizado"
CHECKS = {
    "ck_promociones_fechas",
    "ck_promociones_horario",
    "ck_promociones_porcentaje",
    "ck_promociones_precio_fijo",
    "ck_promociones_nxm",
}


def _preparar_base(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, nombre: str
) -> tuple[str, Config]:
    url = f"sqlite:///{tmp_path / nombre}"
    monkeypatch.setenv("DATABASE_URL", url)
    get_settings.cache_clear()
    return url, Config(str(ALEMBIC_INI))


def _inspeccionar(url: str) -> tuple[set[str], dict[str, dict], list[dict], list[dict], list[dict]]:
    motor = crear_motor(url)
    inspector = inspect(motor)
    tablas = set(inspector.get_table_names())
    columnas = (
        {columna["name"]: columna for columna in inspector.get_columns("promociones")}
        if "promociones" in tablas
        else {}
    )
    indices = inspector.get_indexes("promociones") if "promociones" in tablas else []
    foraneas = (
        inspector.get_foreign_keys("promocion_productos") if "promocion_productos" in tablas else []
    )
    checks = inspector.get_check_constraints("promociones") if "promociones" in tablas else []
    motor.dispose()
    return tablas, columnas, indices, foraneas, checks


def test_upgrade_crea_promociones_y_relacion_con_productos(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "promociones.db")

    command.upgrade(config, REVISION)
    tablas, columnas, indices, foraneas, checks = _inspeccionar(url)
    get_settings.cache_clear()

    motor = crear_motor(url)
    with motor.connect() as conexion:
        revision_actual = conexion.execute(
            text("SELECT version_num FROM alembic_version")
        ).scalar_one()
    motor.dispose()

    assert revision_actual == REVISION

    script = ScriptDirectory.from_config(config)
    cabezas = script.get_heads()
    historia = {revision.revision for revision in script.iterate_revisions(cabezas, "base")}
    assert len(cabezas) == 1
    assert REVISION in historia
    assert {"promociones", "promocion_productos"} <= tablas
    assert set(columnas) == {
        "id",
        "nombre",
        "nombre_normalizado",
        "tipo",
        "descripcion",
        "fecha_desde",
        "fecha_hasta",
        "dias_semana",
        "hora_desde",
        "hora_hasta",
        "descuento_porcentaje",
        "precio_fijo",
        "cant_lleva",
        "cant_paga",
        "estado",
    }
    assert columnas["precio_fijo"]["type"].precision == 10
    assert columnas["precio_fijo"]["type"].scale == 2
    assert columnas["descripcion"]["nullable"] is True
    assert columnas["hora_desde"]["nullable"] is True
    assert {"productos", "promociones"} == {fk["referred_table"] for fk in foraneas}
    assert {check["name"] for check in checks} >= CHECKS
    indice = next(indice for indice in indices if indice["name"] == INDICE_UNICO)
    assert indice["unique"] == 1
    assert indice["column_names"] == ["nombre_normalizado"]


def test_downgrade_elimina_las_tablas_de_promociones(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "promociones-down.db")

    command.upgrade(config, REVISION)
    command.downgrade(config, REVISION_ANTERIOR)
    tablas, columnas, indices, foraneas, checks = _inspeccionar(url)
    get_settings.cache_clear()

    assert "promociones" not in tablas
    assert "promocion_productos" not in tablas
    assert columnas == {}
    assert indices == []
    assert foraneas == []
    assert checks == []
