"""Fabricas de datos para las pruebas del modulo salon."""

from collections.abc import Callable

import pytest
from sqlalchemy.orm import Session

from app.modules.salon.models import Sector
from app.shared.models import Estado

FabricaSector = Callable[..., Sector]


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
