"""M4 migration invariants in an isolated SQLite database."""

from datetime import UTC, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import Numeric, func, inspect, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from alembic import command

ALEMBIC_INI = Path(__file__).resolve().parents[3] / "alembic.ini"


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
    command.downgrade(config, "d6b7c8e9f0a1")
    motor = crear_motor(url)
    with motor.connect() as conexion:
        tablas = set(inspect(conexion).get_table_names())
        assert "comandas" not in tablas
        assert "detalles_comanda" not in tablas
        assert {"mesas", "productos", "menus_ejecutivos"} <= tablas
        assert conexion.execute(text("SELECT numero FROM mesas WHERE id = 1")).scalar_one() == 1
        version = conexion.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
        assert version == "d6b7c8e9f0a1"
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
