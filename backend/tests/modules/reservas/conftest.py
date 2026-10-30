"""Fabricas de datos para las pruebas del modulo reservas."""

from collections.abc import Callable
from datetime import date, time

import pytest
from sqlalchemy.orm import Session

from app.modules.reservas.models import EstadoReserva, Reserva
from app.modules.salon.models import Mesa, Sector
from app.shared.models import Estado
from app.shared.models.enums import EstadoMesa

FabricaSector = Callable[..., Sector]
FabricaMesa = Callable[..., Mesa]
FabricaReserva = Callable[..., Reserva]


@pytest.fixture
def fabrica_sector(db: Session) -> FabricaSector:
    def crear(
        nombre: str = "Salón principal",
        descripcion: str | None = None,
        estado: Estado = Estado.HABILITADO,
    ) -> Sector:
        sector = Sector(nombre=nombre, descripcion=descripcion, estado=estado)
        db.add(sector)
        db.commit()
        return sector

    return crear


@pytest.fixture
def fabrica_mesa(db: Session) -> FabricaMesa:
    def crear(
        sector: Sector,
        numero: int = 1,
        capacidad: int = 4,
        estado: EstadoMesa = EstadoMesa.LIBRE,
    ) -> Mesa:
        mesa = Mesa(numero=numero, capacidad=capacidad, sector_id=sector.id, estado=estado)
        db.add(mesa)
        db.commit()
        return mesa

    return crear


@pytest.fixture
def fabrica_reserva(db: Session) -> FabricaReserva:
    def crear(
        mesa: Mesa,
        cliente_nombre: str = "Ana Pérez",
        cliente_telefono: str = "2804000000",
        fecha: date = date(2026, 12, 1),
        hora: time = time(21, 0),
        cantidad_personas: int = 4,
        estado: EstadoReserva = EstadoReserva.ACTIVA,
    ) -> Reserva:
        reserva = Reserva(
            cliente_nombre=cliente_nombre,
            cliente_telefono=cliente_telefono,
            fecha=fecha,
            hora=hora,
            cantidad_personas=cantidad_personas,
            mesa_id=mesa.id,
            estado=estado,
        )
        db.add(reserva)
        db.commit()
        return reserva

    return crear
