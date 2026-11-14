"""Fabricas de datos para las pruebas del modulo menus."""

from collections.abc import Callable, Iterator
from decimal import Decimal
from pathlib import Path

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.modules.productos.models import Seccion
from app.shared.models import Categoria, Estado, Producto

FabricaSeccion = Callable[..., Seccion]
FabricaProducto = Callable[..., Producto]


@pytest.fixture
def fabrica_seccion(db: Session) -> FabricaSeccion:
    def crear(
        nombre: str = "Principales",
        orden: int | None = None,
        estado: Estado = Estado.HABILITADO,
    ) -> Seccion:
        if orden is None:
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
        nombre: str = "Milanesa",
        categoria: Categoria = Categoria.PLATO,
        estado: Estado = Estado.HABILITADO,
        precio: Decimal = Decimal("1500.00"),
    ) -> Producto:
        producto = Producto(
            nombre=nombre,
            categoria=categoria,
            precio=precio,
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


@pytest.fixture
def directorio_media(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Path]:
    """Apunta MEDIA_DIR a una carpeta temporal: las pruebas no escriben en la carpeta real."""
    carpeta = tmp_path / "media"
    monkeypatch.setenv("MEDIA_DIR", str(carpeta))
    get_settings.cache_clear()
    yield carpeta
    get_settings.cache_clear()
