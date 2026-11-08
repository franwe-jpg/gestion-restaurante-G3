"""Fabricas de datos para las pruebas del modulo productos."""

from collections.abc import Callable, Iterator
from datetime import datetime
from decimal import Decimal
from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.modules.atencion.models import Comanda, DetalleComanda
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
    def crear(
        seccion: Seccion,
        nombre: str = "Flan",
        estado: Estado = Estado.HABILITADO,
        categoria: Categoria = Categoria.POSTRE,
    ):
        producto = Producto(
            nombre=nombre,
            categoria=categoria,
            precio=Decimal("1500.00"),
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


LineaPedida = tuple[int | None, int] | tuple[int | None, int, int | None]
SembrarComanda = Callable[..., None]


@pytest.fixture
def sembrar_comanda(db: Session) -> SembrarComanda:
    """Fábrica de comandas con líneas para las pruebas del reporte (HU-M1-15).

    Cada línea es `(producto_id, cantidad)` o `(producto_id, cantidad, promocion_id)`; con
    `producto_id` `None` la línea es de un menú ejecutivo.
    """
    db.execute(
        text(
            "INSERT INTO sectores (id, nombre, nombre_normalizado, estado) "
            "VALUES (1, 'Sala', 'sala', 'HABILITADO')"
        )
    )
    estado = {"mesa": 0, "menu": False}

    def sembrar(
        fecha_hora: datetime, lineas: list[LineaPedida], estado_comanda: str = "CERRADA"
    ) -> None:
        estado["mesa"] += 1
        db.execute(
            text(
                "INSERT INTO mesas (id, numero, capacidad, sector_id, estado) "
                "VALUES (:n, :n, 4, 1, 'LIBRE')"
            ),
            {"n": estado["mesa"]},
        )
        comanda = Comanda(mesa_id=estado["mesa"], estado=estado_comanda, fecha_hora=fecha_hora)
        db.add(comanda)
        db.flush()
        for producto_id, cantidad, *resto in lineas:
            if producto_id is None and not estado["menu"]:
                db.execute(
                    text(
                        "INSERT INTO menus_ejecutivos (id, nombre, nombre_normalizado, "
                        "precio_fijo, estado, seccion_id) "
                        "VALUES (1, 'Menu', 'menu', 10, 'HABILITADO', "
                        "(SELECT MIN(id) FROM secciones))"
                    )
                )
                estado["menu"] = True
            db.add(
                DetalleComanda(
                    comanda_id=comanda.id,
                    producto_id=producto_id,
                    menu_ejecutivo_id=None if producto_id else 1,
                    cantidad=cantidad,
                    precio_unitario=Decimal("10"),
                    descuento=Decimal("0"),
                    promocion_id=resto[0] if resto else None,
                )
            )
        db.commit()

    return sembrar
