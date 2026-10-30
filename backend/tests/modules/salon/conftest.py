"""Fabricas de datos para las pruebas del modulo salon."""

from collections.abc import Callable

import pytest
from sqlalchemy.orm import Session

from app.modules.salon.models import Mesa, Sector
from app.shared.models import Estado
from app.shared.models.enums import EstadoMesa

FabricaSector = Callable[..., Sector]
FabricaMesa = Callable[..., Mesa]


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
        mesa = Mesa(
            numero=numero,
            capacidad=capacidad,
            sector_id=sector.id,
            estado=estado,
        )
        db.add(mesa)
        db.commit()
        return mesa

    return crear
