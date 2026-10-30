"""Pruebas de la migración del menú ejecutivo (HU-M2-01)."""

from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError

from alembic import command
from app.config import get_settings
from app.database import crear_motor

ALEMBIC_INI = Path(__file__).resolve().parents[3] / "alembic.ini"
REVISION = "d6b7c8e9f0a1"
INDICE_UNICO = "ux_menus_ejecutivos_nombre_normalizado"
CHECK_PRECIO = "ck_menus_ejecutivos_precio_positivo"


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
        {columna["name"]: columna for columna in inspector.get_columns("menus_ejecutivos")}
        if "menus_ejecutivos" in tablas
        else {}
    )
    indices = inspector.get_indexes("menus_ejecutivos") if "menus_ejecutivos" in tablas else []
    foraneas = (
        inspector.get_foreign_keys("menu_ejecutivo_productos")
        if "menu_ejecutivo_productos" in tablas
        else []
    )
    checks = (
        inspector.get_check_constraints("menus_ejecutivos") if "menus_ejecutivos" in tablas else []
    )
    motor.dispose()
    return tablas, columnas, indices, foraneas, checks


def _insertar_seccion(url: str) -> None:
    motor = crear_motor(url)
    with motor.begin() as conexion:
        conexion.execute(
            text(
                "INSERT INTO secciones "
                "(nombre, nombre_normalizado, orden, estado) "
                "VALUES ('Principal', 'principal', 1, 'HABILITADO')"
            )
        )
    motor.dispose()


def _insertar_menu(url: str, precio: str) -> None:
    motor = crear_motor(url)
    with motor.begin() as conexion:
        conexion.execute(
            text(
                "INSERT INTO menus_ejecutivos "
                "(nombre, nombre_normalizado, descripcion, precio_fijo, estado, seccion_id) "
                "VALUES ('Almuerzo', 'almuerzo', NULL, :precio, 'HABILITADO', 1)"
            ),
            {"precio": precio},
        )
    motor.dispose()


def test_upgrade_crea_menu_ejecutivo_y_relacion_con_productos(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "menus.db")
    command.upgrade(config, REVISION)
    tablas, columnas, indices, foraneas, checks = _inspeccionar(url)
    motor = crear_motor(url)
    with motor.connect() as conexion:
        revision_actual = conexion.execute(
            text("SELECT version_num FROM alembic_version")
        ).scalar_one()
    motor.dispose()
    get_settings.cache_clear()
    assert revision_actual == REVISION
    assert {"menus_ejecutivos", "menu_ejecutivo_productos"} <= tablas
    assert set(columnas) == {
        "id",
        "nombre",
        "nombre_normalizado",
        "descripcion",
        "precio_fijo",
        "estado",
        "seccion_id",
    }
    assert columnas["precio_fijo"]["type"].precision == 10
    assert columnas["precio_fijo"]["type"].scale == 2
    assert columnas["descripcion"]["nullable"] is True
    assert {"productos", "menus_ejecutivos"} == {fk["referred_table"] for fk in foraneas}
    assert {CHECK_PRECIO} <= {check["name"] for check in checks}
    indice = next(indice for indice in indices if indice["name"] == INDICE_UNICO)
    assert indice["unique"]
    assert indice["column_names"] == ["nombre_normalizado"]


@pytest.mark.parametrize("precio", ["0", "-1.00"], ids=["cero", "negativo"])
def test_upgrade_rechaza_precio_fijo_no_positivo(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, precio: str
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, f"precio-{precio}.db")
    command.upgrade(config, REVISION)
    _insertar_seccion(url)
    with pytest.raises(IntegrityError):
        _insertar_menu(url, precio)
    get_settings.cache_clear()


def test_downgrade_elimina_menu_y_conserva_catalogo(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "downgrade.db")
    command.upgrade(config, REVISION)