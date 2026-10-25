"""Fabricas de datos para las pruebas del modulo productos."""

from collections.abc import Callable
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from app.modules.productos.models import Seccion
from app.shared.models import Categoria, Estado, Producto

FabricaSeccion = Callable[..., Seccion]
FabricaProducto = Callable[..., Producto]


@pytest.fixture
def fabrica_seccion(db: Session) -> FabricaSeccion:
    def crear(nombre: str = "Postres", orden: int = 1, estado: Estado = Estado.HABILITADO):
        seccion = Seccion(nombre=nombre, orden=orden, estado=estado)
        db.add(seccion)
        db.commit()
        return seccion

    return crear


@pytest.fixture
def fabrica_producto(db: Session) -> FabricaProducto:
    def crear(seccion: Seccion, nombre: str = "Flan", estado: Estado = Estado.HABILITADO):
        producto = Producto(
            nombre=nombre,
            categoria=Categoria.POSTRE,
            precio=Decimal("1500.00"),
            estado=estado,
            seccion_id=seccion.id,
        )
        db.add(producto)
        db.commit()
        return producto

    return crear
