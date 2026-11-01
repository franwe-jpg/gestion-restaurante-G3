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
REVISION_RESERVAS = "d6f8a0c2e4b6"
REVISION_ANTERIOR = "a8c0e2b4d6f8"  # head de develop sobre el que cuelga la migración
COLUMNAS = {"id", "mesa_id", "cliente_id", "fecha", "hora", "cantidad_personas", "estado"}
CHECK_CANTIDAD = "ck_reservas_cantidad_personas_positiva"
UNICO_ACTIVA = "ux_reservas_mesa_fecha_hora_activa"
INDICE_FECHA = "ix_reservas_fecha_hora"


def _preparar_base(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, nombre: str
) -> tuple[str, Config]:
    url = f"sqlite:///{tmp_path / nombre}"
    monkeypatch.setenv("DATABASE_URL", url)
    get_settings.cache_clear()
    return url, Config(str(ALEMBIC_INI))


def _inspeccionar(url: str) -> tuple[set[str], dict]:
    motor = crear_motor(url)
    inspector = inspect(motor)
    tablas = set(inspector.get_table_names())
    detalle: dict = {"columnas": {}, "checks": [], "indices": [], "foraneas": []}
    if "reservas" in tablas:
        detalle = {
            "columnas": {col["name"]: col for col in inspector.get_columns("reservas")},
            "checks": inspector.get_check_constraints("reservas"),
            "indices": inspector.get_indexes("reservas"),
            "foraneas": inspector.get_foreign_keys("reservas"),
        }
    motor.dispose()
    return tablas, detalle


def _insertar_reserva(
    url: str,
    estado: str = "ACTIVA",
    mesa_id: int = 5,
    hora: str = "21:30:00",
    cantidad_personas: int = 4,
) -> None:
    motor = crear_motor(url)
    with motor.begin() as conexion:
        conexion.execute(
            text(
                "INSERT INTO reservas "
                "(mesa_id, cliente_id, fecha, hora, cantidad_personas, estado) "
                "VALUES (:mesa_id, 7, '2026-11-02', :hora, :cantidad_personas, :estado)"
            ),
            {
                "mesa_id": mesa_id,
                "hora": hora,
                "cantidad_personas": cantidad_personas,
                "estado": estado,
            },
        )
    motor.dispose()


def test_upgrade_head_crea_reservas_con_una_sola_cabeza(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "reservas.db")

    command.upgrade(config, "head")
    tablas, _detalle = _inspeccionar(url)
    cabezas = ScriptDirectory.from_config(config).get_heads()
    get_settings.cache_clear()

    assert cabezas == [REVISION_RESERVAS]
    assert "reservas" in tablas


def test_upgrade_define_columnas_no_nulas_check_e_indices(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "estructura.db")

    command.upgrade(config, "head")
    _tablas, detalle = _inspeccionar(url)
    get_settings.cache_clear()

    assert set(detalle["columnas"]) == COLUMNAS
    assert all(not columna["nullable"] for columna in detalle["columnas"].values())
    # S10: mesa_id y cliente_id no tienen clave foranea.
    assert detalle["foraneas"] == []
    assert CHECK_CANTIDAD in {check["name"] for check in detalle["checks"]}

    indices = {indice["name"]: indice for indice in detalle["indices"]}
    assert indices[UNICO_ACTIVA]["unique"]
    assert indices[UNICO_ACTIVA]["column_names"] == ["mesa_id", "fecha", "hora"]
    assert not indices[INDICE_FECHA]["unique"]
    assert indices[INDICE_FECHA]["column_names"] == ["fecha", "hora"]


def test_upgrade_impone_el_check_de_cantidad_personas(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "check.db")
    command.upgrade(config, "head")
    _insertar_reserva(url, cantidad_personas=1)

    with pytest.raises(IntegrityError):
        _insertar_reserva(url, mesa_id=6, cantidad_personas=0)
    get_settings.cache_clear()


# R13 a nivel de base: ni una insercion directa puede duplicar el turno activo.
def test_upgrade_impide_dos_reservas_activas_en_el_mismo_turno(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "unico.db")
    command.upgrade(config, "head")
    _insertar_reserva(url)

    with pytest.raises(IntegrityError):
        _insertar_reserva(url)
    _insertar_reserva(url, mesa_id=6)  # otra mesa, mismo turno: se acepta
    _insertar_reserva(url, hora="22:00:00")  # otra hora, misma mesa: se acepta
    get_settings.cache_clear()


def test_upgrade_permite_turno_repetido_si_una_no_esta_activa(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "parcial.db")
    command.upgrade(config, "head")

    _insertar_reserva(url, estado="ACTIVA")
    _insertar_reserva(url, estado="ATENDIDA")
    _insertar_reserva(url, estado="CANCELADA_POR_AUSENCIA")

    motor = crear_motor(url)
    with motor.connect() as conexion:
        total = conexion.execute(text("SELECT COUNT(*) FROM reservas")).scalar()
    motor.dispose()
    get_settings.cache_clear()
    assert total == 3


def test_downgrade_a_la_revision_anterior_elimina_reservas_y_conserva_mesas(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "baja.db")
    command.upgrade(config, "head")
    tablas_antes, _detalle = _inspeccionar(url)

    command.downgrade(config, REVISION_ANTERIOR)
    tablas, _detalle = _inspeccionar(url)
    get_settings.cache_clear()

    assert "reservas" in tablas_antes
    assert "reservas" not in tablas
    assert "mesas" in tablas
    assert "sectores" in tablas
    assert "alembic_version" in tablas


def test_downgrade_y_upgrade_de_nuevo_recrean_reservas(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "ciclo.db")
    command.upgrade(config, "head")
    command.downgrade(config, REVISION_ANTERIOR)

    command.upgrade(config, "head")
    tablas, detalle = _inspeccionar(url)
    get_settings.cache_clear()

    assert "reservas" in tablas
    assert {indice["name"] for indice in detalle["indices"]} == {UNICO_ACTIVA, INDICE_FECHA}
