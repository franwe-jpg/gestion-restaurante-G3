"""Fabricas de datos para las pruebas de menús ejecutivos."""

from collections.abc import Callable
from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.productos.models import Seccion
from app.shared.models import Categoria, Estado, Producto

FabricaSeccion = Callable[..., Seccion]
FabricaProducto = Callable[..., Producto]


@pytest.fixture
def fabrica_seccion(db: Session) -> FabricaSeccion:
    def crear(nombre: str = "Principal", estado: Estado = Estado.HABILITADO) -> Seccion:
        orden = len(db.scalars(select(Seccion)).all()) + 1
        seccion = Seccion(nombre=nombre, orden=orden, estado=estado)
        db.add(seccion)
        db.commit()
        return seccion

    return crear


@pytest.fixture
def fabrica_producto(db: Session) -> FabricaProducto:
    def crear(
        seccion: Seccion,
        nombre: str = "Plato principal",
        categoria: Categoria = Categoria.PLATO,
        estado: Estado = Estado.HABILITADO,
    ) -> Producto:
        producto = Producto(
            nombre=nombre,
            categoria=categoria,
            precio=Decimal("1000.00"),
            ingredientes=[],
            descripcion=None,
            imagen=None,
            etiquetas=[],
            estado=estado,
            seccion_id=seccion.id,
        )
        db.add(producto)
        db.commit()
        return producto

    return crear
