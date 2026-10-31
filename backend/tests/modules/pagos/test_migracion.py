"""Pruebas de la migracion de la tabla medios_pago (HU-M6-04 a HU-M6-07)."""

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
INDICE_UNICO = "ux_medios_pago_nombre_normalizado"
REVISION_ANTERIOR = "0e9f2fe2e157"


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
    existe = "medios_pago" in tablas
    columnas = (
        {columna["name"]: columna for columna in inspector.get_columns("medios_pago")}
        if existe
        else {}
    )
    indices = inspector.get_indexes("medios_pago") if existe else []
    motor.dispose()
    return tablas, columnas, indices


def _insertar(url: str, nombre: str, eliminado: int = 0) -> None:
    motor = crear_motor(url)
    with motor.begin() as conexion:
        conexion.execute(
            text(
                "INSERT INTO medios_pago "
                "(nombre, nombre_normalizado, tipo, descripcion, estado, eliminado) "
                "VALUES (:nombre, :normalizado, 'EFECTIVO', NULL, 'HABILITADO', :eliminado)"
            ),
            {"nombre": nombre, "normalizado": nombre.strip().casefold(), "eliminado": eliminado},
        )
    motor.dispose()


def test_upgrade_head_deja_una_sola_cabeza_y_crea_medios_pago(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "medios.db")

    command.upgrade(config, "head")
    tablas, _columnas, _indices = _inspeccionar(url)
    cabezas = ScriptDirectory.from_config(config).get_heads()
    get_settings.cache_clear()

    assert len(cabezas) == 1
    assert "medios_pago" in tablas


def test_upgrade_define_columnas_y_largos(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "columnas.db")

    command.upgrade(config, "head")
    _tablas, columnas, _indices = _inspeccionar(url)
    get_settings.cache_clear()

    assert set(columnas) == {
        "id",
        "nombre",
        "nombre_normalizado",
        "tipo",
        "descripcion",
        "estado",
        "eliminado",
    }
    assert columnas["nombre"]["type"].length == 50
    assert columnas["descripcion"]["type"].length == 200
    assert columnas["descripcion"]["nullable"] is True
    for obligatoria in ("nombre", "nombre_normalizado", "tipo", "estado", "eliminado"):
        assert columnas[obligatoria]["nullable"] is False


def test_upgrade_crea_el_indice_unico_parcial(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "indice.db")

    command.upgrade(config, "head")
    _tablas, _columnas, indices = _inspeccionar(url)
    get_settings.cache_clear()

    indice = next(indice for indice in indices if indice["name"] == INDICE_UNICO)
    assert indice["unique"]
    assert indice["column_names"] == ["nombre_normalizado"]


def test_indice_impone_unicidad_solo_entre_no_eliminados(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "unicidad.db")
    command.upgrade(config, "head")
    _insertar(url, "Efectivo", eliminado=1)
    _insertar(url, "Efectivo")

    with pytest.raises(IntegrityError):
        _insertar(url, " EFECTIVO ")
    get_settings.cache_clear()


def test_downgrade_elimina_medios_pago(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "baja.db")
    command.upgrade(config, "head")

    command.downgrade(config, REVISION_ANTERIOR)
    tablas, _columnas, _indices = _inspeccionar(url)
    get_settings.cache_clear()

    assert "medios_pago" not in tablas
    assert "alembic_version" in tablas
