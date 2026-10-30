"""Pruebas de la migracion de la tabla reservas (HU-M5-01)."""

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

COLUMNAS_RESERVAS = {
    "id",
    "cliente_nombre",
    "cliente_telefono",
    "fecha",
    "hora",
    "cantidad_personas",
    "mesa_id",
    "estado",
}
CHECK_CANTIDAD_PERSONAS = "ck_reservas_cantidad_personas_positiva"


def _preparar_base(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, nombre: str
) -> tuple[str, Config]:
    url = f"sqlite:///{tmp_path / nombre}"
    monkeypatch.setenv("DATABASE_URL", url)
    get_settings.cache_clear()
    return url, Config(str(ALEMBIC_INI))


def _inspeccionar(url: str) -> tuple[set[str], dict[str, dict], dict]:
    motor = crear_motor(url)
    inspector = inspect(motor)
    tablas = set(inspector.get_table_names())
    if "reservas" in tablas:
        columnas = {columna["name"]: columna for columna in inspector.get_columns("reservas")}
        foraneas = inspector.get_foreign_keys("reservas")
        restricciones = inspector.get_check_constraints("reservas")
        indices = inspector.get_indexes("reservas")
    else:
        columnas, foraneas, restricciones, indices = {}, [], [], []
    motor.dispose()
    return tablas, columnas, {"foraneas": foraneas, "checks": restricciones, "indices": indices}


def _insertar_sector(url: str) -> None:
    motor = crear_motor(url)
    with motor.begin() as conexion:
        conexion.execute(
            text(
                "INSERT INTO sectores (nombre, nombre_normalizado, descripcion, estado) "
                "VALUES ('Salón principal', 'salón principal', NULL, 'HABILITADO')"
            )
        )
    motor.dispose()


def _insertar_mesa(url: str, numero: int = 1) -> None:
    motor = crear_motor(url)
    with motor.begin() as conexion:
        conexion.execute(
            text(
                "INSERT INTO mesas (numero, capacidad, sector_id, estado) "
                "VALUES (:numero, 4, 1, 'LIBRE')"
            ),
            {"numero": numero},
        )
    motor.dispose()


def _insertar_reserva(url: str, mesa_id: int, cantidad_personas: int = 4) -> None:
    motor = crear_motor(url)
    with motor.begin() as conexion:
        conexion.execute(
            text(
                "INSERT INTO reservas "
                "(cliente_nombre, cliente_telefono, fecha, hora, "
                "cantidad_personas, mesa_id, estado) "
                "VALUES ('Ana Pérez', '2804000000', '2026-12-01', '21:00:00', "
                ":cantidad_personas, :mesa_id, 'ACTIVA')"
            ),
            {"cantidad_personas": cantidad_personas, "mesa_id": mesa_id},
        )
    motor.dispose()


def test_upgrade_crea_reservas_con_columnas_fk_y_check(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "reservas.db")

    command.upgrade(config, "head")
    tablas, columnas, restricciones = _inspeccionar(url)
    cabezas = ScriptDirectory.from_config(config).get_heads()
    get_settings.cache_clear()

    assert len(cabezas) == 1
    assert "reservas" in tablas
    assert set(columnas) == COLUMNAS_RESERVAS
    assert all(not columna["nullable"] for columna in columnas.values())

    foranea = restricciones["foraneas"][0]
    assert foranea["constrained_columns"] == ["mesa_id"]
    assert foranea["referred_table"] == "mesas"

    nombres_check = {check["name"] for check in restricciones["checks"]}
    assert CHECK_CANTIDAD_PERSONAS in nombres_check

    indice = next(
        indice
        for indice in restricciones["indices"]
        if indice["name"] == "ux_reservas_mesa_fecha_hora_activa"
    )
    assert indice["unique"]
    assert indice["column_names"] == ["mesa_id", "fecha", "hora"]


def test_upgrade_impone_el_indice_unico_de_reserva_activa(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "indice-reservas.db")
    command.upgrade(config, "head")
    _insertar_sector(url)
    _insertar_mesa(url)
    _insertar_reserva(url, mesa_id=1)

    with pytest.raises(IntegrityError):
        _insertar_reserva(url, mesa_id=1)
    get_settings.cache_clear()


def test_upgrade_impone_el_check_de_cantidad_de_personas(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "check-reservas.db")
    command.upgrade(config, "head")
    _insertar_sector(url)
    _insertar_mesa(url)

    with pytest.raises(IntegrityError):
        _insertar_reserva(url, mesa_id=1, cantidad_personas=0)
    get_settings.cache_clear()


def test_upgrade_impone_la_foreign_key_con_restrict(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "fk-reservas.db")
    command.upgrade(config, "head")
    _insertar_sector(url)
    _insertar_mesa(url)
    _insertar_reserva(url, mesa_id=1)

    motor = crear_motor(url)
    with pytest.raises(IntegrityError), motor.begin() as conexion:
        conexion.execute(text("DELETE FROM mesas WHERE id = 1"))
    motor.dispose()
    get_settings.cache_clear()


def test_downgrade_de_un_paso_elimina_reservas_y_conserva_mesas(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "baja-reservas.db")
    command.upgrade(config, "head")

    command.downgrade(config, "-1")
    tablas, _columnas, _restricciones = _inspeccionar(url)
    get_settings.cache_clear()

    assert "reservas" not in tablas
    assert "mesas" in tablas
