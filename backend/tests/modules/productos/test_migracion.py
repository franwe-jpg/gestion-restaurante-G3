from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import inspect, text

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
    command.downgrade(config, "efdafc2a164c")
    tablas = _tablas(url)
    get_settings.cache_clear()

    assert "secciones" not in tablas
    assert "productos" not in tablas
    assert "alembic_version" in tablas


REVISION_PREVIA = "a1c3e5f7b9d1"
INDICE_UNICO = "ux_productos_categoria_nombre_normalizado"


def _preparar_base(tmp_path: Path, monkeypatch, nombre: str) -> tuple[str, Config]:
    url = f"sqlite:///{tmp_path / nombre}"
    monkeypatch.setenv("DATABASE_URL", url)
    get_settings.cache_clear()
    return url, Config(str(ALEMBIC_INI))


def _insertar_productos(url: str, filas: list[tuple[str, str]]) -> None:
    motor = crear_motor(url)
    with motor.begin() as conexion:
        conexion.execute(
            text(
                "INSERT INTO secciones (id, nombre, nombre_normalizado, orden, estado) "
                "VALUES (1, 'Platos', 'platos', 1, 'HABILITADO')"
            )
        )
        for nombre, categoria in filas:
            conexion.execute(
                text(
                    "INSERT INTO productos (nombre, categoria, precio, ingredientes, etiquetas, "
                    "estado, seccion_id) VALUES (:nombre, :categoria, 10, '[]', '[]', "
                    "'HABILITADO', 1)"
                ),
                {"nombre": nombre, "categoria": categoria},
            )
    motor.dispose()


def _leer(url: str, consulta: str) -> list[tuple]:
    motor = crear_motor(url)
    with motor.connect() as conexion:
        filas = [tuple(fila) for fila in conexion.execute(text(consulta))]
    motor.dispose()
    return filas


def _columnas_e_indices(url: str) -> tuple[set[str], set[str]]:
    motor = crear_motor(url)
    inspector = inspect(motor)
    columnas = {columna["name"] for columna in inspector.get_columns("productos")}
    indices = {indice["name"] for indice in inspector.get_indexes("productos")}
    motor.dispose()
    return columnas, indices


def test_upgrade_rellena_nombre_normalizado_de_las_filas_existentes(
    tmp_path: Path, monkeypatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "relleno.db")
    command.upgrade(config, REVISION_PREVIA)
    _insertar_productos(url, [("  Milanesa ", "PLATO"), ("ÑANDÚ", "PLATO"), ("Flan", "POSTRE")])

    command.upgrade(config, "head")
    filas = _leer(url, "SELECT nombre, nombre_normalizado FROM productos ORDER BY id")
    columnas, indices = _columnas_e_indices(url)
    get_settings.cache_clear()

    assert filas == [("  Milanesa ", "milanesa"), ("ÑANDÚ", "ñandú"), ("Flan", "flan")]
    assert "nombre_normalizado" in columnas
    assert INDICE_UNICO in indices


def test_upgrade_permite_el_mismo_nombre_en_otra_categoria(tmp_path: Path, monkeypatch) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "categorias.db")
    command.upgrade(config, REVISION_PREVIA)
    _insertar_productos(url, [("Tiramisú", "PLATO"), ("tiramisú", "POSTRE")])

    command.upgrade(config, "head")
    total = _leer(url, "SELECT count(*) FROM productos")
    get_settings.cache_clear()

    assert total == [(2,)]


def test_upgrade_aborta_con_repetidos_en_la_misma_categoria_y_no_toca_el_esquema(
    tmp_path: Path, monkeypatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "repetidos.db")
    command.upgrade(config, REVISION_PREVIA)
    _insertar_productos(url, [("Flan", "POSTRE"), (" flan ", "POSTRE")])

    with pytest.raises(RuntimeError, match="repetid"):
        command.upgrade(config, "head")
    columnas, indices = _columnas_e_indices(url)
    get_settings.cache_clear()

    assert "nombre_normalizado" not in columnas
    assert INDICE_UNICO not in indices


def test_downgrade_a_la_revision_previa_quita_columna_e_indice_y_conserva_las_filas(
    tmp_path: Path, monkeypatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "baja.db")
    command.upgrade(config, REVISION_PREVIA)
    _insertar_productos(url, [("Milanesa", "PLATO"), ("Flan", "POSTRE")])
    command.upgrade(config, "head")

    command.downgrade(config, REVISION_PREVIA)
    columnas, indices = _columnas_e_indices(url)
    nombres = _leer(url, "SELECT nombre FROM productos ORDER BY id")
    get_settings.cache_clear()

    assert "nombre_normalizado" not in columnas
    assert INDICE_UNICO not in indices
    assert nombres == [("Milanesa",), ("Flan",)]
