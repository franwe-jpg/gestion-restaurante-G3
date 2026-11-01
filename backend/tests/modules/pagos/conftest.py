"""Fabricas de datos para las pruebas del modulo pagos."""

from collections.abc import Callable

import pytest
from sqlalchemy.orm import Session

from app.modules.pagos.models import MedioPago, TipoMedioPago
from app.shared.models import Estado

FabricaMedioPago = Callable[..., MedioPago]


@pytest.fixture
def fabrica_medio_pago(db: Session) -> FabricaMedioPago:
    def crear(
        nombre: str = "Efectivo",
        tipo: TipoMedioPago = TipoMedioPago.EFECTIVO,
        descripcion: str | None = None,
        estado: Estado = Estado.HABILITADO,
        eliminado: bool = False,
    ) -> MedioPago:
        medio = MedioPago(
            nombre=nombre,
            tipo=tipo,
            descripcion=descripcion,
            estado=estado,
            eliminado=eliminado,
        )
        db.add(medio)
        db.commit()
        return medio

    return crear
