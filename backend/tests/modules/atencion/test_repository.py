"""Consultas de Cliente y Comanda sobre SQLite temporal."""

from decimal import Decimal

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.atencion import repository
from app.modules.atencion.models import Cliente, Comanda, DetalleComanda, estado_segun_entrega
from app.shared.paginacion import ParametrosPaginacion


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


def test_obtener_comanda_recupera_detalles_historicos(db: Session) -> None:
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
    db.add(
        DetalleComanda(
            comanda_id=comanda.id,
            producto_id=1,
            cantidad=2,
            precio_unitario=Decimal("29.90"),
            descuento=Decimal("3.25"),
        )
    )
    db.commit()
    db.expunge_all()

    recuperada = repository.obtener_comanda(db, comanda.id)

    assert recuperada.id == comanda.id
    assert recuperada.mesa_id == 1
    assert len(recuperada.detalles) == 1
    assert recuperada.detalles[0].producto_id == 1
    assert recuperada.detalles[0].precio_unitario == Decimal("29.90")
    assert recuperada.detalles[0].descuento == Decimal("3.25")


def test_obtener_comanda_no_devuelve_otra_comanda_si_id_no_existe(db: Session) -> None:
    _crear_mesa(db)
    db.add(Comanda(mesa_id=1))
    db.commit()

    assert repository.obtener_comanda(db, 999) is None
    assert db.execute(text("SELECT COUNT(*) FROM comandas")).scalar_one() == 1


@pytest.fixture
def registros(db: Session) -> list[Cliente]:
    clientes = [
        Cliente(nombre="Ana", telefono="123"),
        Cliente(nombre="Anabel", telefono="123"),
        Cliente(nombre="Luis", telefono="456"),
        Cliente(nombre="A%na", telefono="789"),
    ]
    db.add_all(clientes)
    db.commit()
    return clientes


@pytest.mark.parametrize(
    "q,esperados",
    [
        (None, ["Ana", "Anabel", "Luis", "A%na"]),
        ("Ana", ["Ana", "Anabel"]),
        ("nabel", ["Anabel"]),
        ("123", ["Ana", "Anabel"]),
        ("sin coincidencias", []),
        ("%", ["A%na"]),
        ("_", []),
    ],
)
def test_listar_clientes_filtra_literal_y_cuenta(
    db: Session, registros: list[Cliente], q: str | None, esperados: list[str]
) -> None:
    items, total = repository.listar_clientes(db, ParametrosPaginacion(), q)

    assert [item.nombre for item in items] == esperados
    assert total == len(esperados)


def test_listar_clientes_cuenta_antes_de_paginar(db: Session, registros: list[Cliente]) -> None:
    items, total = repository.listar_clientes(db, ParametrosPaginacion(limit=1, offset=1), "Ana")

    assert [item.nombre for item in items] == ["Anabel"]
    assert total == 2


def test_listar_clientes_vacio(db: Session) -> None:
    items, total = repository.listar_clientes(db, ParametrosPaginacion(), None)

    assert items == []
    assert total == 0


# Entregas por cantidad (HU-M4-08)


def _detalle_nuevo(db: Session, comanda: Comanda, **campos: int) -> DetalleComanda:
    detalle = DetalleComanda(
        comanda_id=comanda.id,
        producto_id=1,
        precio_unitario=Decimal("29.90"),
        descuento=Decimal("0.00"),
        **{"cantidad": 3, **campos},
    )
    db.add(detalle)
    return detalle


def test_detalle_comanda_cantidad_entregada_default_cero(db: Session, comanda: Comanda) -> None:
    detalle = _detalle_nuevo(db, comanda)
    db.commit()
    db.expire_all()

    assert db.get(DetalleComanda, detalle.id).cantidad_entregada == 0


def test_detalle_comanda_cantidad_entregada_rechaza_mayor_que_cantidad(
    db: Session, comanda: Comanda
) -> None:
    _detalle_nuevo(db, comanda, cantidad=3, cantidad_entregada=4)

    with pytest.raises(IntegrityError):
        db.flush()
    db.rollback()


@pytest.mark.parametrize(
    ("cantidad", "entregada", "esperado"),
    [
        (3, 3, "ENTREGADO"),
        (1, 1, "ENTREGADO"),
        (3, 2, "PENDIENTE"),
        (3, 0, "PENDIENTE"),
        (3, 4, "PENDIENTE"),
    ],
)
def test_estado_segun_entrega_es_entregado_solo_si_esta_completa(
    cantidad: int, entregada: int, esperado: str
) -> None:
    assert estado_segun_entrega(cantidad, entregada) == esperado


def _leer(db: Session, detalle: DetalleComanda) -> tuple[int, str]:
    db.expire_all()
    guardado = db.get(DetalleComanda, detalle.id)
    return guardado.cantidad_entregada, guardado.estado_entrega


def test_registrar_entrega_parcial_deja_pendiente(db: Session, comanda_con_lineas: Comanda) -> None:
    detalle = comanda_con_lineas.detalles[1]

    assert repository.registrar_entrega(db, comanda_con_lineas.id, detalle.id, 4) is True

    assert _leer(db, detalle) == (4, "PENDIENTE")


def test_registrar_entrega_completa_deja_entregado(
    db: Session, comanda_con_lineas: Comanda
) -> None:
    detalle = comanda_con_lineas.detalles[0]

    assert repository.registrar_entrega(db, comanda_con_lineas.id, detalle.id, 3) is True

    assert _leer(db, detalle) == (3, "ENTREGADO")


def test_registrar_entrega_baja_cantidad_vuelve_a_pendiente(
    db: Session, comanda_con_lineas: Comanda
) -> None:
    detalle = comanda_con_lineas.detalles[0]
    repository.registrar_entrega(db, comanda_con_lineas.id, detalle.id, 3)

    assert repository.registrar_entrega(db, comanda_con_lineas.id, detalle.id, 2) is True
    assert _leer(db, detalle) == (2, "PENDIENTE")
    assert repository.registrar_entrega(db, comanda_con_lineas.id, detalle.id, 0) is True
    assert _leer(db, detalle) == (0, "PENDIENTE")


def test_registrar_entrega_mismo_valor_devuelve_true_idempotente(
    db: Session, comanda_con_lineas: Comanda
) -> None:
    detalle = comanda_con_lineas.detalles[1]
    repository.registrar_entrega(db, comanda_con_lineas.id, detalle.id, 4)

    assert repository.registrar_entrega(db, comanda_con_lineas.id, detalle.id, 4) is True

    assert _leer(db, detalle) == (4, "PENDIENTE")


def test_registrar_entrega_mayor_que_cantidad_devuelve_false_sin_cambios(
    db: Session, comanda_con_lineas: Comanda
) -> None:
    detalle = comanda_con_lineas.detalles[0]

    assert repository.registrar_entrega(db, comanda_con_lineas.id, detalle.id, 4) is False

    assert _leer(db, detalle) == (0, "PENDIENTE")


@pytest.mark.parametrize("estado", ["CERRADA", "ANULADA"])
def test_registrar_entrega_comanda_no_abierta_devuelve_false_sin_cambios(
    db: Session, comanda_con_lineas: Comanda, estado: str
) -> None:
    detalle = comanda_con_lineas.detalles[0]
    comanda_con_lineas.estado = estado
    db.commit()

    assert repository.registrar_entrega(db, comanda_con_lineas.id, detalle.id, 3) is False

    assert _leer(db, detalle) == (0, "PENDIENTE")


def test_registrar_entrega_detalle_de_otra_comanda_devuelve_false_sin_cambios(
    db: Session, comanda: Comanda, comanda_con_lineas: Comanda
) -> None:
    ajeno = comanda.detalles[0]  # ENTREGADO 2 de 2 en la comanda de la mesa 1

    assert repository.registrar_entrega(db, comanda_con_lineas.id, ajeno.id, 1) is False

    assert _leer(db, ajeno) == (2, "ENTREGADO")


def test_registrar_entrega_no_modifica_otros_detalles(
    db: Session, comanda_con_lineas: Comanda
) -> None:
    primero, segundo = comanda_con_lineas.detalles

    repository.registrar_entrega(db, comanda_con_lineas.id, primero.id, 3)

    assert _leer(db, primero) == (3, "ENTREGADO")
    assert _leer(db, segundo) == (0, "PENDIENTE")


def test_obtener_comanda_ordena_los_detalles_por_id(db: Session) -> None:
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
    db.execute(
        text(
            "INSERT INTO comandas (id, mesa_id, estado, fecha_hora) "
            "VALUES (1, 1, 'ABIERTA', '2026-10-31T14:15:00.000000+00:00')"
        )
    )
    for identificador in (7, 2, 5):  # insertados fuera de orden
        db.execute(
            text(
                "INSERT INTO detalles_comanda (id, comanda_id, producto_id, cantidad, "
                "estado_entrega, precio_unitario, descuento) "
                "VALUES (:id, 1, 1, 1, 'PENDIENTE', 10, 0)"
            ),
            {"id": identificador},
        )
    db.commit()

    comanda = repository.obtener_comanda(db, 1)

    assert [detalle.id for detalle in comanda.detalles] == [2, 5, 7]
