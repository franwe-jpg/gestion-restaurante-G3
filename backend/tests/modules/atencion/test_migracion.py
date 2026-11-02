"""Pruebas de migraciones de Cliente y Comanda en bases SQLite temporales."""

from collections.abc import Iterator
from datetime import UTC, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

import pytest
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import Numeric, func, inspect, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from alembic import command
from app.config import get_settings
from app.database import crear_motor
from app.modules.atencion.models import Cliente

ALEMBIC_INI = Path(__file__).resolve().parents[3] / "alembic.ini"
REVISION_ANTERIOR = "0e9f2fe2e157"


def test_upgrade_crea_tablas_comandas_y_detalles(db: Session) -> None:
    inspector = inspect(db.connection())

    assert {"comandas", "detalles_comanda"} <= set(inspector.get_table_names())
    columnas_comanda = {columna["name"]: columna for columna in inspector.get_columns("comandas")}
    columnas_detalle = {
        columna["name"]: columna for columna in inspector.get_columns("detalles_comanda")
    }
    assert {"id", "mesa_id", "reserva_id", "estado", "fecha_hora", "observaciones"} <= set(
        columnas_comanda
    )
    assert {
        "id",
        "comanda_id",
        "producto_id",
        "menu_ejecutivo_id",
        "cantidad",
        "estado_entrega",
        "precio_unitario",
        "descuento",
        "promocion_id",
    } <= set(columnas_detalle)
    assert columnas_comanda["mesa_id"]["nullable"] is False
    assert columnas_detalle["comanda_id"]["nullable"] is False
    assert columnas_detalle["cantidad"]["nullable"] is False


def test_upgrade_referencia_solo_tablas_existentes(db: Session) -> None:
    inspector = inspect(db.connection())
    assert {"comandas", "detalles_comanda"} <= set(inspector.get_table_names())
    assert db.execute(text("PRAGMA foreign_keys")).scalar_one() == 1

    foraneas_comanda = {
        (
            tuple(clave["constrained_columns"]),
            clave["referred_table"],
            tuple(clave["referred_columns"]),
        )
        for clave in inspector.get_foreign_keys("comandas")
    }
    foraneas_detalle = {
        (
            tuple(clave["constrained_columns"]),
            clave["referred_table"],
            tuple(clave["referred_columns"]),
        )
        for clave in inspector.get_foreign_keys("detalles_comanda")
    }
    assert foraneas_comanda == {(("mesa_id",), "mesas", ("id",))}
    assert foraneas_detalle == {
        (("comanda_id",), "comandas", ("id",)),
        (("producto_id",), "productos", ("id",)),
        (("menu_ejecutivo_id",), "menus_ejecutivos", ("id",)),
    }


def test_upgrade_restringe_origen_y_cantidad_del_detalle(db: Session) -> None:
    inspector = inspect(db.connection())
    assert "detalles_comanda" in inspector.get_table_names()
    checks = {
        "".join(check["sqltext"].lower().split()).replace("(", "").replace(")", "")
        for check in inspector.get_check_constraints("detalles_comanda")
    }
    assert "cantidad>0" in checks
    assert (
        "(producto_idisnotnullandmenu_ejecutivo_idisnull)or"
        "(producto_idisnullandmenu_ejecutivo_idisnotnull)"
    ).replace("(", "").replace(")", "") in checks


def test_upgrade_restringe_una_abierta_por_mesa(db: Session) -> None:
    inspector = inspect(db.connection())
    assert "comandas" in inspector.get_table_names()
    indices = inspector.get_indexes("comandas")
    assert any(indice["unique"] and indice["column_names"] == ["mesa_id"] for indice in indices)
    definiciones = db.execute(
        text("SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'comandas'")
    ).scalars()
    assert any(
        "WHERE ESTADO = 'ABIERTA'" in " ".join(sql.upper().split()) for sql in definiciones if sql
    )


def test_upgrade_importes_historicos_decimales(db: Session) -> None:
    columnas = {
        columna["name"]: columna
        for columna in inspect(db.connection()).get_columns("detalles_comanda")
    }
    for nombre in ("precio_unitario", "descuento"):
        tipo = columnas[nombre]["type"]
        assert isinstance(tipo, Numeric)
        assert (tipo.precision, tipo.scale) == (10, 2)


def _crear_mesa(db: Session) -> None:
    db.execute(
        text(
            "INSERT INTO sectores (id, nombre, nombre_normalizado, estado) "
            "VALUES (1, 'Sala', 'sala', 'HABILITADO')"
        )
    )
    db.execute(
        text(
            "INSERT INTO mesas (id, numero, capacidad, sector_id, estado) "
            "VALUES (1, 1, 4, 1, 'LIBRE')"
        )
    )


def test_detalle_conserva_importes_absolutos_tras_cambio_de_catalogo(db: Session) -> None:
    from app.modules.atencion.models import Comanda, DetalleComanda

    _crear_mesa(db)
    db.execute(
        text(
            "INSERT INTO secciones (id, nombre, nombre_normalizado, orden, estado) "
            "VALUES (1, 'Carta', 'carta', 1, 'HABILITADO')"
        )
    )
    db.execute(
        text(
            "INSERT INTO productos (id, nombre, nombre_normalizado, categoria, precio, "
            "ingredientes, etiquetas, estado, seccion_id) "
            "VALUES (1, 'Plato', 'plato', 'PLATO', 29.90, '[]', '[]', 'HABILITADO', 1)"
        )
    )
    comanda = Comanda(mesa_id=1)
    db.add(comanda)
    db.flush()
    detalle = DetalleComanda(
        comanda_id=comanda.id,
        producto_id=1,
        cantidad=2,
        precio_unitario=Decimal("29.90"),
        descuento=Decimal("3.25"),
    )
    db.add(detalle)
    db.commit()
    db.execute(text("UPDATE productos SET precio = 35.50 WHERE id = 1"))
    db.expire_all()
    guardado = db.scalar(select(DetalleComanda).where(DetalleComanda.id == detalle.id))
    assert guardado.precio_unitario == Decimal("29.90")
    assert guardado.descuento == Decimal("3.25")


def test_fecha_hora_utc_se_genera_y_recupera_sin_perder_zona(db: Session) -> None:
    from app.modules.atencion.models import Comanda

    _crear_mesa(db)
    comanda = Comanda(mesa_id=1)
    db.add(comanda)
    db.commit()
    db.expire_all()
    recuperada = db.get(Comanda, comanda.id)
    assert recuperada.fecha_hora.tzinfo is not None
    assert recuperada.fecha_hora.utcoffset() == timedelta(0)
    assert abs((datetime.now(UTC) - recuperada.fecha_hora).total_seconds()) < 30
    almacenada = db.execute(
        text("SELECT fecha_hora FROM comandas WHERE id = :id"), {"id": comanda.id}
    ).scalar_one()
    assert almacenada.endswith("+00:00")


def test_fecha_hora_con_offset_se_normaliza_a_utc(db: Session) -> None:
    from app.modules.atencion.models import Comanda

    _crear_mesa(db)
    instante = datetime(2026, 10, 31, 11, 15, tzinfo=timezone(timedelta(hours=-3)))
    comanda = Comanda(mesa_id=1, fecha_hora=instante)
    db.add(comanda)
    db.commit()
    db.expire_all()
    assert db.get(Comanda, comanda.id).fecha_hora == datetime(2026, 10, 31, 14, 15, tzinfo=UTC)
    almacenada = db.execute(
        text("SELECT fecha_hora FROM comandas WHERE id = :id"), {"id": comanda.id}
    ).scalar_one()
    assert almacenada == "2026-10-31T14:15:00.000000+00:00"


def test_downgrade_elimina_solo_tablas_m4(db: Session) -> None:
    from app.database import crear_motor

    assert {"comandas", "detalles_comanda"} <= set(inspect(db.connection()).get_table_names())
    _crear_mesa(db)
    db.execute(
        text(
            "INSERT INTO comandas (id, mesa_id, estado, fecha_hora) "
            "VALUES (1, 1, 'ABIERTA', '2026-10-31T14:15:00.000000+00:00')"
        )
    )
    db.commit()
    url = str(db.get_bind().url)
    db.close()
    config = Config(str(ALEMBIC_INI))
    command.downgrade(config, "e7a9c1d3f5b7")
    motor = crear_motor(url)
    with motor.connect() as conexion:
        tablas = set(inspect(conexion).get_table_names())
        assert "comandas" not in tablas
        assert "detalles_comanda" not in tablas
        assert {"mesas", "productos", "menus_ejecutivos"} <= tablas
        assert conexion.execute(text("SELECT numero FROM mesas WHERE id = 1")).scalar_one() == 1
        version = conexion.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
        assert version == "e7a9c1d3f5b7"
    motor.dispose()


def test_indice_parcial_bloquea_segunda_abierta_sin_bloquear_cerrada(db: Session) -> None:
    from app.modules.atencion.models import Comanda

    _crear_mesa(db)
    db.add_all([Comanda(mesa_id=1, estado="CERRADA"), Comanda(mesa_id=1)])
    db.commit()
    db.add(Comanda(mesa_id=1))
    with pytest.raises(IntegrityError):
        db.flush()
    db.rollback()
    assert db.scalar(select(func.count()).select_from(Comanda)) == 2


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
        assert {"menus_ejecutivos", "mesas", "mozos", "productos", "alembic_version"} <= tablas
    finally:
        motor.dispose()

    command.upgrade(config, "head")
    motor = crear_motor(url)
    try:
        assert "clientes" in inspect(motor).get_table_names()
    finally:
        motor.dispose()


# Migración de la cantidad entregada (HU-M4-08)

REVISION_ENTREGAS = "a8c0e2b4d6f8"
REVISION_PREVIA_ENTREGAS = "e7a9c1b3d5f7"


def _sembrar_detalles(url: str) -> None:
    """Dos líneas ENTREGADO (cantidad 3 y 5) y una PENDIENTE (cantidad 4) en la revisión previa."""
    motor = crear_motor(url)
    try:
        with motor.begin() as conexion:
            for sentencia in (
                "INSERT INTO sectores (id, nombre, nombre_normalizado, estado) "
                "VALUES (1, 'Sala', 'sala', 'HABILITADO')",
                "INSERT INTO mesas (id, numero, capacidad, sector_id, estado) "
                "VALUES (1, 1, 4, 1, 'OCUPADA')",
                "INSERT INTO secciones (id, nombre, nombre_normalizado, orden, estado) "
                "VALUES (1, 'Carta', 'carta', 1, 'HABILITADO')",
                "INSERT INTO productos (id, nombre, nombre_normalizado, categoria, precio, "
                "ingredientes, etiquetas, estado, seccion_id) "
                "VALUES (1, 'Plato', 'plato', 'PLATO', 10, '[]', '[]', 'HABILITADO', 1)",
                "INSERT INTO comandas (id, mesa_id, estado, fecha_hora) "
                "VALUES (1, 1, 'ABIERTA', '2026-10-31T14:15:00.000000+00:00')",
                "INSERT INTO detalles_comanda (id, comanda_id, producto_id, cantidad, "
                "estado_entrega, precio_unitario, descuento) VALUES "
                "(1, 1, 1, 3, 'ENTREGADO', 10, 0), (2, 1, 1, 4, 'PENDIENTE', 10, 0), "
                "(3, 1, 1, 5, 'ENTREGADO', 10, 0)",
            ):
                conexion.execute(text(sentencia))
    finally:
        motor.dispose()


def _consultar(url: str, sql: str) -> list[tuple]:
    motor = crear_motor(url)
    try:
        with motor.connect() as conexion:
            return [tuple(fila) for fila in conexion.execute(text(sql))]
    finally:
        motor.dispose()


def test_migracion_cantidad_entregada_una_sola_cabeza(base_temporal: tuple[str, Config]) -> None:
    _, config = base_temporal
    script = ScriptDirectory.from_config(config)

    assert len(script.get_heads()) == 1
    assert script.get_revision(REVISION_ENTREGAS).down_revision == REVISION_PREVIA_ENTREGAS


def test_migracion_cantidad_entregada_agrega_columna_con_default_cero(
    base_temporal: tuple[str, Config],
) -> None:
    url, config = base_temporal
    command.upgrade(config, REVISION_ENTREGAS)
    motor = crear_motor(url)
    try:
        columnas = {c["name"]: c for c in inspect(motor).get_columns("detalles_comanda")}
        assert columnas["cantidad_entregada"]["nullable"] is False
        assert str(columnas["cantidad_entregada"]["default"]).strip("'()") == "0"
    finally:
        motor.dispose()
    _sembrar_detalles(url)  # sin indicar la columna: aplica el valor por defecto

    assert _consultar(url, "SELECT cantidad_entregada FROM detalles_comanda ORDER BY id") == [
        (0,),
        (0,),
        (0,),
    ]


def test_migracion_cantidad_entregada_mueve_entregados_a_cantidad(
    base_temporal: tuple[str, Config],
) -> None:
    url, config = base_temporal
    command.upgrade(config, REVISION_PREVIA_ENTREGAS)
    _sembrar_detalles(url)

    command.upgrade(config, REVISION_ENTREGAS)

    filas = _consultar(
        url,
        "SELECT id, cantidad, cantidad_entregada, estado_entrega FROM detalles_comanda ORDER BY id",
    )
    assert filas == [(1, 3, 3, "ENTREGADO"), (2, 4, 0, "PENDIENTE"), (3, 5, 5, "ENTREGADO")]
    assert all(
        (entregada == cantidad) == (estado == "ENTREGADO")
        for _, cantidad, entregada, estado in filas
    )


SENTENCIAS_FUERA_DE_RANGO = {
    "negativo": "UPDATE detalles_comanda SET cantidad_entregada = -1",
    "mayor-que-cantidad": "UPDATE detalles_comanda SET cantidad_entregada = cantidad + 1",
}


@pytest.mark.parametrize(
    "sentencia", SENTENCIAS_FUERA_DE_RANGO.values(), ids=list(SENTENCIAS_FUERA_DE_RANGO)
)
def test_migracion_cantidad_entregada_check_de_rango_rechaza_fuera_de_rango(
    base_temporal: tuple[str, Config], sentencia: str
) -> None:
    url, config = base_temporal
    command.upgrade(config, REVISION_PREVIA_ENTREGAS)
    _sembrar_detalles(url)
    command.upgrade(config, REVISION_ENTREGAS)

    motor = crear_motor(url)
    try:
        with pytest.raises(IntegrityError), motor.begin() as conexion:
            conexion.execute(text(sentencia))
        with motor.begin() as conexion:  # los extremos válidos siguen permitidos
            conexion.execute(text("UPDATE detalles_comanda SET cantidad_entregada = cantidad"))
            conexion.execute(text("UPDATE detalles_comanda SET cantidad_entregada = 0"))
    finally:
        motor.dispose()


def test_migracion_cantidad_entregada_conserva_checks_y_claves_foraneas_previos(
    base_temporal: tuple[str, Config],
) -> None:
    url, config = base_temporal
    command.upgrade(config, REVISION_ENTREGAS)
    motor = crear_motor(url)
    try:
        inspector = inspect(motor)
        checks = {c["name"] for c in inspector.get_check_constraints("detalles_comanda")}
        foraneas = {
            (tuple(c["constrained_columns"]), c["referred_table"], c["options"].get("ondelete"))
            for c in inspector.get_foreign_keys("detalles_comanda")
        }
    finally:
        motor.dispose()

    assert checks >= {
        "ck_detalles_comanda_cantidad_positiva",
        "ck_detalles_comanda_origen_exclusivo",
        "ck_detalles_comanda_cantidad_entregada_rango",
    }
    assert foraneas == {
        (("comanda_id",), "comandas", "CASCADE"),
        (("producto_id",), "productos", "RESTRICT"),
        (("menu_ejecutivo_id",), "menus_ejecutivos", "RESTRICT"),
    }


def test_migracion_cantidad_entregada_downgrade_conserva_estado_entrega(
    base_temporal: tuple[str, Config],
) -> None:
    url, config = base_temporal
    command.upgrade(config, REVISION_PREVIA_ENTREGAS)
    _sembrar_detalles(url)
    command.upgrade(config, REVISION_ENTREGAS)

    command.downgrade(config, REVISION_PREVIA_ENTREGAS)

    motor = crear_motor(url)
    try:
        columnas = {c["name"] for c in inspect(motor).get_columns("detalles_comanda")}
        checks = {c["name"] for c in inspect(motor).get_check_constraints("detalles_comanda")}
    finally:
        motor.dispose()
    assert "cantidad_entregada" not in columnas
    assert "ck_detalles_comanda_cantidad_entregada_rango" not in checks
    assert "ck_detalles_comanda_cantidad_positiva" in checks
    assert _consultar(url, "SELECT id, estado_entrega FROM detalles_comanda ORDER BY id") == [
        (1, "ENTREGADO"),
        (2, "PENDIENTE"),
        (3, "ENTREGADO"),
    ]
