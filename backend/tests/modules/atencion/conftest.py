"""Datos M4 sobre SQLite temporal migrado: SQL local o servicios reales de M1, M2 y M3."""

from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.atencion.models import Comanda, DetalleComanda
from app.modules.menus import service as menus_service
from app.modules.menus.schemas import MenuEjecutivoCrear
from app.modules.productos import service as productos_service
from app.modules.productos.schemas import PlatoCrear, SeccionCrear
from app.modules.salon import service as salon_service
from app.modules.salon.schemas import MesaCrear, SectorCrear
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


@dataclass(frozen=True)
class Salon:
    """Ids creados con los servicios reales de salón, productos y menús."""

    mesa_id: int
    plato_id: int
    menu_id: int


@pytest.fixture
def salon(db: Session) -> Salon:
    sector = salon_service.crear_sector(db, SectorCrear(nombre="Salón principal"))
    mesa = salon_service.crear_mesa(db, MesaCrear(numero=10, capacidad=4, sector_id=sector.id))
    seccion = productos_service.crear_seccion(db, SeccionCrear(nombre="Principales", orden=1))
    plato = productos_service.crear_producto(
        db,
        PlatoCrear(
            nombre="Milanesa",
            seccion_id=seccion.id,
            precio=Decimal("1500.50"),
            ingredientes=["Carne"],
        ),
        None,
    )
    menu = menus_service.crear_menu_ejecutivo(
        db,
        MenuEjecutivoCrear(
            nombre="Ejecutivo del día",
            precio_fijo=Decimal("4200.00"),
            producto_ids=[plato.id],
            seccion_id=seccion.id,
        ),
    )
    return Salon(mesa_id=mesa.id, plato_id=plato.id, menu_id=menu.id)
