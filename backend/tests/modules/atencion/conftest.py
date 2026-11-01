"""Datos locales M4 sobre SQLite temporal migrado, sin servicios ajenos."""

from datetime import UTC, datetime
from decimal import Decimal

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.atencion.models import Comanda, DetalleComanda
from app.shared.contratos.comanda import EstadoComanda, EstadoEntrega


@pytest.fixture
def comanda(db: Session) -> Comanda:
    db.execute(
        text(
            "INSERT INTO sectores (id, nombre, nombre_normalizado, estado) "
            "VALUES (1, 'Sala', 'sala', 'HABILITADO')"
        )
    )
    db.execute(
        text(
            "INSERT INTO mesas (id, numero, capacidad, sector_id, estado) "
            "VALUES (1, 1, 4, 1, 'OCUPADA'), (2, 2, 4, 1, 'LIBRE')"
        )
    )
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
            "VALUES (1, 'Plato', 'plato', 'PLATO', 99.90, '[]', '[]', 'HABILITADO', 1)"
        )
    )
    registro = Comanda(
        mesa_id=1,
        estado=EstadoComanda.ABIERTA,
        fecha_hora=datetime(2026, 10, 31, 12, 30, 15, 123456, tzinfo=UTC),
        reserva_id=7,
        observaciones="Sin sal",
        detalles=[
            DetalleComanda(
                producto_id=1,
                cantidad=2,
                precio_unitario=Decimal("29.90"),
                descuento=Decimal("3.25"),
                promocion_id=8,
                estado_entrega=EstadoEntrega.ENTREGADO,
            )
        ],
    )
    db.add(registro)
    db.commit()
    return registro
