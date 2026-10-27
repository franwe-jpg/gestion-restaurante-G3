"""Fabricas de datos para las pruebas del modulo menus."""

from collections.abc import Callable, Iterator
from decimal import Decimal
from pathlib import Path

import pytest
from sqlalchemy.orm import Session

from app.config import get_settings
from app.modules.productos.models import Seccion
from app.shared.models import Categoria, Estado, Producto

FabricaSeccion = Callable[..., Seccion]
FabricaProducto = Callable[..., Producto]


@pytest.fixture
def fabrica_seccion(db: Session) -> FabricaSeccion:
    def crear(nombre: str = "Principales", orden: int = 1, estado: Estado = Estado.HABILITADO):
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
    ):
        producto = Producto(
            nombre=nombre,
            categoria=categoria,
            precio=precio,
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
