"""Adaptadores de M4 sobre los servicios reales de salón, productos y menús (HU-M4-04)."""

from decimal import Decimal

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.atencion.adaptadores import CatalogoDeCarta, MesasDeSalon
from app.modules.menus import service as menus_service
from app.modules.productos import service as productos_service
from app.modules.salon import service as salon_service
from app.shared.contratos.comanda import DetalleComandaCrear, EstadoEntrega
from app.shared.excepciones import NoEncontradoError, ReglaDeNegocioError
from app.shared.models import Categoria
from app.shared.models.enums import EstadoMesa


def _poner_estado(db: Session, mesa_id: int, estado: EstadoMesa) -> None:
    db.execute(
        text("UPDATE mesas SET estado=:estado WHERE id=:id"), {"estado": estado, "id": mesa_id}
    )
    db.commit()


def test_validar_disponibilidad_mesa_libre_no_falla(db: Session, salon) -> None:
    MesasDeSalon().validar_disponibilidad(db, salon.mesa_id)


def test_validar_disponibilidad_mesa_inexistente_lanza_no_encontrado(db: Session) -> None:
    with pytest.raises(NoEncontradoError, match="La mesa 999 no existe"):
        MesasDeSalon().validar_disponibilidad(db, 999)


@pytest.mark.parametrize("estado", [EstadoMesa.OCUPADA, EstadoMesa.FUERA_DE_SERVICIO])
def test_validar_disponibilidad_mesa_no_libre_lanza_regla(
    db: Session, salon, estado: EstadoMesa
) -> None:
    _poner_estado(db, salon.mesa_id, estado)

    with pytest.raises(ReglaDeNegocioError, match="La mesa 10 no está libre"):
        MesasDeSalon().validar_disponibilidad(db, salon.mesa_id)


def test_ocupar_mesa_libre_queda_ocupada_sin_confirmar(db: Session, salon) -> None:
    MesasDeSalon().ocupar(db, salon.mesa_id)

    assert salon_service.obtener_mesa(db, salon.mesa_id).estado == EstadoMesa.OCUPADA
    with Session(db.get_bind()) as otra:
        assert salon_service.obtener_mesa(otra, salon.mesa_id).estado == EstadoMesa.LIBRE


def test_cotizar_producto_usa_precio_actual_sin_promocion(db: Session, salon) -> None:
    cotizacion = CatalogoDeCarta().cotizar(
        db, DetalleComandaCrear(producto_id=salon.plato_id, cantidad=3)
    )

    assert cotizacion.producto_id == salon.plato_id
    assert cotizacion.menu_ejecutivo_id is None
    assert cotizacion.cantidad == 3
    assert cotizacion.precio_unitario == Decimal("1500.50")
    assert cotizacion.descuento == Decimal("0.00")
    assert cotizacion.promocion_id is None
    assert cotizacion.estado_entrega == EstadoEntrega.PENDIENTE


def test_cotizar_menu_ejecutivo_usa_precio_fijo(db: Session, salon) -> None:
    cotizacion = CatalogoDeCarta().cotizar(
        db, DetalleComandaCrear(menu_ejecutivo_id=salon.menu_id, cantidad=1)
    )

    assert cotizacion.menu_ejecutivo_id == salon.menu_id
    assert cotizacion.producto_id is None
    assert cotizacion.precio_unitario == Decimal("4200.00")
    assert cotizacion.descuento == Decimal("0.00")
    assert cotizacion.promocion_id is None
    assert cotizacion.estado_entrega == EstadoEntrega.PENDIENTE


@pytest.mark.parametrize(
    "detalle,mensaje",
    [
        (DetalleComandaCrear(producto_id=999, cantidad=1), "El producto 999 no existe"),
        (
            DetalleComandaCrear(menu_ejecutivo_id=999, cantidad=1),
            "El menú ejecutivo 999 no existe",
        ),
    ],
)
def test_cotizar_inexistente_lanza_no_encontrado(
    db: Session, detalle: DetalleComandaCrear, mensaje: str
) -> None:
    with pytest.raises(NoEncontradoError, match=mensaje):
        CatalogoDeCarta().cotizar(db, detalle)


def test_cotizar_producto_deshabilitado_lanza_regla(db: Session, salon) -> None:
    productos_service.dar_de_baja_producto(db, Categoria.PLATO, salon.plato_id)

    with pytest.raises(ReglaDeNegocioError, match="El producto Milanesa está deshabilitado"):
        CatalogoDeCarta().cotizar(db, DetalleComandaCrear(producto_id=salon.plato_id, cantidad=1))


def test_cotizar_menu_deshabilitado_lanza_regla(db: Session, salon) -> None:
    menus_service.dar_de_baja_menu_ejecutivo(db, salon.menu_id)

    with pytest.raises(
        ReglaDeNegocioError, match="El menú ejecutivo Ejecutivo del día está deshabilitado"
    ):
        CatalogoDeCarta().cotizar(
            db, DetalleComandaCrear(menu_ejecutivo_id=salon.menu_id, cantidad=1)
        )
