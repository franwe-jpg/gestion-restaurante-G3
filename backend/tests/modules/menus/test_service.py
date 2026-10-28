"""Pruebas del servicio de menús ejecutivos (HU-M2-01)."""

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.menus import repository, service
from app.modules.menus.models import MenuEjecutivo
from app.modules.menus.schemas import FiltroMenusEjecutivos, MenuEjecutivoCrear
from app.shared.excepciones import NoEncontradoError, ReglaDeNegocioError
from app.shared.models import Categoria, Estado


def _datos(
    nombre: str = "Almuerzo ejecutivo",
    precio: str = "1500.00",
    producto_ids: list[int] | None = None,
    seccion_id: int = 1,
) -> MenuEjecutivoCrear:
    return MenuEjecutivoCrear(
        nombre=nombre,
        precio_fijo=precio,
        producto_ids=producto_ids or [1],
        seccion_id=seccion_id,
        descripcion="Incluye bebida",
    )


def _cantidad(db: Session) -> int:
    return len(db.scalars(select(MenuEjecutivo)).all())


def test_crear_menu_ejecutivo_lo_habilita_y_guarda_relaciones(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion()
    producto = fabrica_producto(seccion)

    salida = service.crear_menu_ejecutivo(
        db, _datos(seccion_id=seccion.id, producto_ids=[producto.id])
    )

    assert salida.estado == Estado.HABILITADO
    assert salida.seccion.id == seccion.id
    assert [item.id for item in salida.productos] == [producto.id]
    assert _cantidad(db) == 1


def test_crear_menu_ejecutivo_rechaza_nombre_repetido_sin_distinguir_mayusculas(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion()
    producto = fabrica_producto(seccion)
    service.crear_menu_ejecutivo(db, _datos(seccion_id=seccion.id, producto_ids=[producto.id]))

    with pytest.raises(ReglaDeNegocioError, match="nombre.*único|ya existe"):
        service.crear_menu_ejecutivo(
            db,
            _datos("  ALMUERZO EJECUTIVO ", seccion_id=seccion.id, producto_ids=[producto.id]),
        )

    assert _cantidad(db) == 1


def test_crear_menu_ejecutivo_convierte_carrera_de_unicidad_en_conflicto(
    db: Session, fabrica_seccion, fabrica_producto, monkeypatch: pytest.MonkeyPatch
) -> None:
    seccion = fabrica_seccion()
    producto = fabrica_producto(seccion)
    datos = _datos(seccion_id=seccion.id, producto_ids=[producto.id])
    service.crear_menu_ejecutivo(db, datos)
    respuestas = iter((False, True))
    monkeypatch.setattr(
        repository,
        "existe_nombre_normalizado",
        lambda *_: next(respuestas),
    )

    with pytest.raises(ReglaDeNegocioError, match="ya existe"):
        service.crear_menu_ejecutivo(db, datos)

    assert _cantidad(db) == 1


def test_crear_menu_ejecutivo_rechaza_producto_inexistente(db: Session, fabrica_seccion) -> None:
    seccion = fabrica_seccion()

    with pytest.raises(NoEncontradoError, match="producto 99"):
        service.crear_menu_ejecutivo(db, _datos(seccion_id=seccion.id, producto_ids=[99]))

    assert _cantidad(db) == 0


@pytest.mark.parametrize(
    "categoria,estado,mensaje",
    [
        (Categoria.PLATO, Estado.DESHABILITADO, "habilitados"),
        (Categoria.MENU_DEL_DIA, Estado.HABILITADO, "menús del día"),
    ],
    ids=["deshabilitado", "menu-del-dia"],
)
def test_crear_menu_ejecutivo_rechaza_producto_no_permitido(
    db: Session,
    fabrica_seccion,
    fabrica_producto,
    categoria: Categoria,
    estado: Estado,
    mensaje: str,
) -> None:
    seccion = fabrica_seccion()
    producto = fabrica_producto(seccion, categoria=categoria, estado=estado)

    with pytest.raises(ReglaDeNegocioError, match=mensaje):
        service.crear_menu_ejecutivo(db, _datos(seccion_id=seccion.id, producto_ids=[producto.id]))

    assert _cantidad(db) == 0


def test_crear_menu_ejecutivo_rechaza_seccion_inexistente(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion()
    producto = fabrica_producto(seccion)

    with pytest.raises(NoEncontradoError, match="sección 99"):
        service.crear_menu_ejecutivo(db, _datos(seccion_id=99, producto_ids=[producto.id]))

    assert _cantidad(db) == 0


def test_crear_menu_ejecutivo_rechaza_seccion_deshabilitada(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion(estado=Estado.DESHABILITADO)
    producto = fabrica_producto(seccion)

    with pytest.raises(ReglaDeNegocioError, match="deshabilitada"):
        service.crear_menu_ejecutivo(db, _datos(seccion_id=seccion.id, producto_ids=[producto.id]))

    assert _cantidad(db) == 0


def test_listar_menus_ejecutivos_pagina_y_filtra_por_estado(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion()
    producto = fabrica_producto(seccion)
    service.crear_menu_ejecutivo(db, _datos(seccion_id=seccion.id, producto_ids=[producto.id]))

    pagina = service.listar_menus_ejecutivos(
        db, FiltroMenusEjecutivos(limit=1, offset=0, estado=Estado.HABILITADO)
    )

    assert pagina.total == 1
    assert len(pagina.items) == 1
    assert pagina.items[0].nombre == "Almuerzo ejecutivo"
