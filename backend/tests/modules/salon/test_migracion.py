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


def test_downgrade_de_tres_pasos_elimina_sectores_y_conserva_las_tablas_de_m1(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "baja.db")
    command.upgrade(config, "head")

    command.downgrade(config, "-3")
    tablas, _columnas, _indices = _inspeccionar(url)
    get_settings.cache_clear()

    assert "mesas" not in tablas
    assert "sectores" not in tablas
    assert "secciones" in tablas
    assert "productos" in tablas
    assert "alembic_version" in tablas


# --- HU-M3-05: tabla mesas ---

COLUMNAS_MESAS = {"id", "numero", "capacidad", "sector_id", "estado"}
CHECK_NUMERO = "ck_mesas_numero_positivo"
CHECK_CAPACIDAD = "ck_mesas_capacidad_positiva"
UNICO_MESAS = "ux_mesas_sector_numero"


def _inspeccionar_mesas(url: str) -> tuple[set[str], dict[str, dict], list[dict]]:
    motor = crear_motor(url)
    inspector = inspect(motor)
    tablas = set(inspector.get_table_names())
    if "mesas" in tablas:
        columnas = {columna["name"]: columna for columna in inspector.get_columns("mesas")}
        foraneas = inspector.get_foreign_keys("mesas")
        restricciones = inspector.get_check_constraints("mesas")
        unicos = inspector.get_unique_constraints("mesas")
    else:
        columnas, foraneas, restricciones, unicos = {}, [], [], []
    motor.dispose()
    return (
        tablas,
        columnas,
        {
            "foraneas": foraneas,
            "checks": restricciones,
            "unicos": unicos,
        },
    )


def _insertar_mesa(url: str, sector_id: int, numero: int, capacidad: int = 4) -> None:
    motor = crear_motor(url)
    with motor.begin() as conexion:
        conexion.execute(
            text(
                "INSERT INTO mesas (numero, capacidad, sector_id, estado) "
                "VALUES (:numero, :capacidad, :sector_id, 'LIBRE')"
            ),
            {"numero": numero, "capacidad": capacidad, "sector_id": sector_id},
        )
    motor.dispose()


def test_upgrade_crea_mesas_con_columnas_fk_y_restricciones(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "mesas.db")

    command.upgrade(config, "head")
    tablas, columnas, restricciones = _inspeccionar_mesas(url)
    cabezas = ScriptDirectory.from_config(config).get_heads()
    get_settings.cache_clear()

    assert len(cabezas) == 1
    assert "mesas" in tablas
    assert set(columnas) == COLUMNAS_MESAS
    assert all(not columna["nullable"] for columna in columnas.values())
    assert columnas["estado"]["nullable"] is False

    foranea = restricciones["foraneas"][0]
    assert foranea["constrained_columns"] == ["sector_id"]
    assert foranea["referred_table"] == "sectores"
    assert foranea["referred_columns"] == ["id"]

    nombres_check = {check["name"] for check in restricciones["checks"]}
    assert {CHECK_NUMERO, CHECK_CAPACIDAD} <= nombres_check

    unico = next(
        restriccion for restriccion in restricciones["unicos"] if restriccion["name"] == UNICO_MESAS
    )
    assert unico["column_names"] == ["sector_id", "numero"]


@pytest.mark.parametrize(
    "campo, valor",
    [("numero", 0), ("numero", -1), ("capacidad", 0), ("capacidad", -1)],
    ids=["numero-cero", "numero-negativo", "capacidad-cero", "capacidad-negativa"],
)
def test_upgrade_impone_los_check_de_numero_y_capacidad(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, campo: str, valor: int
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, f"check-{campo}-{valor}.db")
    command.upgrade(config, "head")
    _insertar_sector(url, "Salón principal", "salón principal")
    datos = {"sector_id": 1, "numero": 1, "capacidad": 4} | {campo: valor}

    with pytest.raises(IntegrityError):
        _insertar_mesa(url, datos["sector_id"], datos["numero"], datos["capacidad"])
    get_settings.cache_clear()


def test_upgrade_impone_la_unicidad_del_numero_por_sector(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "unico-mesas.db")
    command.upgrade(config, "head")
    _insertar_sector(url, "Salón principal", "salón principal")
    _insertar_sector(url, "Terraza", "terraza")
    _insertar_mesa(url, sector_id=1, numero=3)
    _insertar_mesa(url, sector_id=2, numero=3)

    with pytest.raises(IntegrityError):
        _insertar_mesa(url, sector_id=1, numero=3)
    get_settings.cache_clear()


def test_upgrade_impone_la_foreign_key_con_restrict(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "fk-mesas.db")
    command.upgrade(config, "head")
    _insertar_sector(url, "Salón principal", "salón principal")
    _insertar_mesa(url, sector_id=1, numero=1)

    with pytest.raises(IntegrityError):
        _insertar_mesa(url, sector_id=99, numero=2)

    motor = crear_motor(url)
    with pytest.raises(IntegrityError), motor.begin() as conexion:
        conexion.execute(text("DELETE FROM sectores WHERE id = 1"))
    motor.dispose()
    get_settings.cache_clear()


def test_downgrade_de_dos_pasos_elimina_mesas_y_conserva_sectores(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "baja-mesas.db")
    command.upgrade(config, "head")

    command.downgrade(config, "-2")
    tablas, _columnas, _restricciones = _inspeccionar_mesas(url)
    get_settings.cache_clear()

    assert "mozos" not in tablas
    assert "mesas" not in tablas
    assert "sectores" in tablas


# --- HU-M3-09: tabla mozos ---

COLUMNAS_MOZOS = {"id", "dni", "nombre", "apellido", "telefono", "estado"}
UNICO_MOZOS = "ux_mozos_dni"


def _inspeccionar_mozos(url: str) -> tuple[set[str], dict[str, dict], list[dict]]:
    motor = crear_motor(url)
    inspector = inspect(motor)
    tablas = set(inspector.get_table_names())
    if "mozos" in tablas:
        columnas = {columna["name"]: columna for columna in inspector.get_columns("mozos")}
        unicos = inspector.get_unique_constraints("mozos")
    else:
        columnas, unicos = {}, []
    motor.dispose()
    return tablas, columnas, unicos


def _insertar_mozo(url: str, dni: str, estado: str = "HABILITADO") -> None:
    motor = crear_motor(url)
    with motor.begin() as conexion:
        conexion.execute(
            text(
                "INSERT INTO mozos (dni, nombre, apellido, telefono, estado) "
                "VALUES (:dni, 'Juan', 'Fernández', NULL, :estado)"
            ),
            {"dni": dni, "estado": estado},
        )
    motor.dispose()


def test_upgrade_crea_mozos_con_columnas_y_unicidad_de_dni(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "mozos.db")

    command.upgrade(config, "head")
    tablas, columnas, unicos = _inspeccionar_mozos(url)
    cabezas = ScriptDirectory.from_config(config).get_heads()
    get_settings.cache_clear()

    assert len(cabezas) == 1
    assert "mozos" in tablas
    assert set(columnas) == COLUMNAS_MOZOS
    assert columnas["dni"]["type"].length == 8
    assert columnas["nombre"]["type"].length == 60
    assert columnas["apellido"]["type"].length == 60
    assert columnas["telefono"]["type"].length == 30
    assert columnas["telefono"]["nullable"] is True
    assert all(
        not columna["nullable"] for nombre, columna in columnas.items() if nombre != "telefono"
    )

    unico = next(restriccion for restriccion in unicos if restriccion["name"] == UNICO_MOZOS)
    assert unico["column_names"] == ["dni"]


def test_upgrade_impone_la_unicidad_del_dni(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "unico-mozos.db")
    command.upgrade(config, "head")
    _insertar_mozo(url, "30123456")

    with pytest.raises(IntegrityError):
        _insertar_mozo(url, "30123456")
    get_settings.cache_clear()


def test_downgrade_de_un_paso_elimina_mozos_y_conserva_mesas(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    url, config = _preparar_base(tmp_path, monkeypatch, "baja-mozos.db")
    command.upgrade(config, "head")

    command.downgrade(config, "-1")
    tablas, _columnas, _unicos = _inspeccionar_mozos(url)
    get_settings.cache_clear()

    assert "mozos" not in tablas
    assert "mesas" in tablas
    assert "sectores" in tablas
