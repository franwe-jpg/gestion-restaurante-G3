"""Fabricas de datos para las pruebas del modulo pagos."""

from collections.abc import Callable
from dataclasses import dataclass
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from app.modules.atencion.models import Comanda, DetalleComanda
from app.modules.menus import service as menus_service
from app.modules.menus.schemas import MenuEjecutivoCrear
from app.modules.pagos.models import MedioPago, TipoMedioPago
from app.modules.productos import service as productos_service
from app.modules.productos.schemas import PlatoCrear, SeccionCrear
from app.modules.salon import service as salon_service
from app.modules.salon.schemas import MesaCrear, SectorCrear
from app.shared.contratos.comanda import EstadoComanda, EstadoEntrega
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


@dataclass(frozen=True)
class Catalogo:
    """Ids creados con los servicios reales de salon, productos y menus."""

    mesa_id: int
    plato_id: int
    menu_id: int


@pytest.fixture
def catalogo(db: Session) -> Catalogo:
    sector = salon_service.crear_sector(db, SectorCrear(nombre="Salon principal"))
    mesa = salon_service.crear_mesa(db, MesaCrear(numero=10, capacidad=4, sector_id=sector.id))
    seccion = productos_service.crear_seccion(db, SeccionCrear(nombre="Principales", orden=1))
    plato = productos_service.crear_producto(
        db,
        PlatoCrear(
            nombre="Milanesa",
            seccion_id=seccion.id,
            precio=Decimal("1500.50"),
            ingredientes=["Carne"],
        ),
        None,
    )
    menu = menus_service.crear_menu_ejecutivo(
        db,
        MenuEjecutivoCrear(
            nombre="Ejecutivo del dia",
            precio_fijo=Decimal("4200.00"),
            producto_ids=[plato.id],
            seccion_id=seccion.id,
        ),
    )
    return Catalogo(mesa_id=mesa.id, plato_id=plato.id, menu_id=menu.id)


FabricaComanda = Callable[..., int]


@pytest.fixture
def fabrica_comanda(db: Session, catalogo: Catalogo) -> FabricaComanda:
    """Crea una comanda con un plato (2 x 1500.50 - 100.00) y un menu (1 x 4200.00)."""

    def crear(estado: EstadoComanda = EstadoComanda.CERRADA) -> int:
        comanda = Comanda(
            mesa_id=catalogo.mesa_id,
            estado=estado,
            detalles=[
                DetalleComanda(
                    producto_id=catalogo.plato_id,
                    cantidad=2,
                    precio_unitario=Decimal("1500.50"),
                    descuento=Decimal("100.00"),
                    promocion_id=1,
                    estado_entrega=EstadoEntrega.ENTREGADO,
                    cantidad_entregada=2,
                ),
                DetalleComanda(
                    menu_ejecutivo_id=catalogo.menu_id,
                    cantidad=1,
                    precio_unitario=Decimal("4200.00"),
                    descuento=Decimal("0.00"),
                    estado_entrega=EstadoEntrega.ENTREGADO,
                    cantidad_entregada=1,
                ),
            ],
        )
        db.add(comanda)
        db.commit()
        return comanda.id

    return crear
