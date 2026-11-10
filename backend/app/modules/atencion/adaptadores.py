"""Adaptadores de los puertos de Comanda hacia salón, productos y menús (HU-M4-04).

Solo usan el `service` de cada módulo (RNF-MAN-09) y nunca confirman: la transacción
la cierran `service.crear_comanda` y `service.cerrar_comanda` (HU-M4-09).
"""

from collections.abc import Callable
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.modules.menus import service as menus_service
from app.modules.productos import service as productos_service
from app.modules.salon import service as salon_service
from app.shared.contratos.comanda import DetalleComandaCrear, DetalleComandaSalida, EstadoEntrega
from app.shared.excepciones import ReglaDeNegocioError
from app.shared.models import Estado
from app.shared.models.enums import EstadoMesa

SIN_DESCUENTO = Decimal("0.00")


class MesasDeSalon:
    """Implementa `MesasPort` con el servicio de salón (M3)."""

    def validar_disponibilidad(self, db: Session, mesa_id: int) -> None:
        mesa = salon_service.obtener_mesa(db, mesa_id)
        if mesa.estado != EstadoMesa.LIBRE:
            raise ReglaDeNegocioError(f"La mesa {mesa.numero} no está libre")

    def ocupar(self, db: Session, mesa_id: int) -> None:
        salon_service.ocupar_mesa(db, mesa_id)

    def liberar(self, db: Session, mesa_id: int) -> None:
        salon_service.liberar_mesa(db, mesa_id)


class CatalogoDeCarta:
    """Implementa `CatalogoPort` con los servicios de productos (M1) y menús (M2)."""

    def __init__(self, ahora: Callable[[], datetime] | None = None) -> None:
        self._ahora = ahora or (lambda: datetime.now(UTC))

    def cotizar(self, db: Session, detalle: DetalleComandaCrear) -> DetalleComandaSalida:
        if detalle.producto_id is not None:
            precio = _precio_de_producto(db, detalle.producto_id)
        else:
            precio = _precio_de_menu_ejecutivo(db, detalle.menu_ejecutivo_id)
        aplicada = menus_service.promocion_para_linea(
            db,
            producto_id=detalle.producto_id,
            menu_ejecutivo_id=detalle.menu_ejecutivo_id,
            precio_unitario=precio,
            cantidad=detalle.cantidad,
            momento=self._ahora(),
        )
        return DetalleComandaSalida(
            **detalle.model_dump(),
            precio_unitario=precio,
            descuento=aplicada.descuento if aplicada is not None else SIN_DESCUENTO,
            promocion_id=aplicada.promocion_id if aplicada is not None else None,
            estado_entrega=EstadoEntrega.PENDIENTE,
        )


def _precio_de_producto(db: Session, producto_id: int) -> Decimal:
    [producto] = productos_service.obtener_productos_por_ids(db, [producto_id])
    if producto.estado != Estado.HABILITADO:
        raise ReglaDeNegocioError(f"El producto {producto.nombre} está deshabilitado")
    return producto.precio


def _precio_de_menu_ejecutivo(db: Session, menu_id: int) -> Decimal:
    menu = menus_service.obtener_menu_ejecutivo(db, menu_id)
    if menu.estado != Estado.HABILITADO:
        raise ReglaDeNegocioError(f"El menú ejecutivo {menu.nombre} está deshabilitado")
    return menu.precio_fijo
