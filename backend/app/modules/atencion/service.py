"""Servicios de Comanda y Cliente del módulo Atención."""

from decimal import Decimal
from typing import Protocol

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.atencion import repository
from app.modules.atencion.schemas import (
    ClienteModificar,
    ClienteSalida,
    DetallePendiente,
    PendientesComanda,
)
from app.shared.contratos.comanda import (
    ComandaCrear,
    ComandaResumen,
    ComandaSalida,
    DetalleComandaCrear,
    DetalleComandaSalida,
    EstadoComanda,
    EstadoEntrega,
)
from app.shared.excepciones import DatosInvalidosError, NoEncontradoError, ReglaDeNegocioError
from app.shared.paginacion import Pagina, ParametrosPaginacion


class MesasPort(Protocol):
    """M4-owned requirement, not an existing M3 service. Never commit or change sessions."""

    def validar_disponibilidad(self, db: Session, mesa_id: int) -> None: ...

    def ocupar(self, db: Session, mesa_id: int) -> None: ...


class CatalogoPort(Protocol):
    """M4-owned quote requirement, not an M1/M2 adapter; no commits allowed.

    Resolve availability, current price and applicable promotion for the requested
    quantity. Return an absolute discount already calculated by its owner, not a
    percentage; M4 does not decide its unit/line interpretation or round it.
    """

    def cotizar(self, db: Session, detalle: DetalleComandaCrear) -> DetalleComandaSalida: ...


class ComandaAbiertaError(ReglaDeNegocioError):
    """Local A01 identification; the global HTTP payload does not expose this ID."""

    def __init__(self, comanda_id: int) -> None:
        self.comanda_id = comanda_id
        super().__init__("An ABIERTA Comanda already exists for this Mesa")


class EntregasPendientesError(ReglaDeNegocioError):
    """A02 metadata without changing the shared order output contract."""

    def __init__(self, datos: PendientesComanda) -> None:
        self.comanda_id = datos.comanda_id
        self.pendientes = datos.pendientes
        super().__init__("La comanda tiene productos pendientes de entrega")


def consultar_pendientes(db: Session, comanda_id: int) -> PendientesComanda:
    comanda = repository.obtener_comanda(db, comanda_id)
    if comanda is None:
        raise NoEncontradoError(f"La comanda {comanda_id} no existe")
    return PendientesComanda(
        comanda_id=comanda.id,
        pendientes=[
            DetallePendiente.model_validate(detalle, from_attributes=True)
            for detalle in comanda.detalles
            if detalle.estado_entrega == EstadoEntrega.PENDIENTE
        ],
    )


def crear_comanda(
    db: Session, datos: ComandaCrear, mesas: MesasPort, catalogo: CatalogoPort
) -> ComandaSalida:
    """Own the transaction; callers must supply real providers before HTTP wiring."""
    try:
        datos = ComandaCrear.model_validate(datos.model_dump(warnings=False))
        existente = repository.obtener_abierta_por_mesa(db, datos.mesa_id)
        if existente is not None:
            raise ComandaAbiertaError(existente.id)
        mesas.validar_disponibilidad(db, datos.mesa_id)
        detalles = [_cotizar(db, detalle, catalogo) for detalle in datos.detalles]
        comanda = repository.crear_comanda(db, datos, detalles)
        mesas.ocupar(db, datos.mesa_id)
        salida = ComandaSalida.model_validate(comanda, from_attributes=True)
        db.commit()
    except IntegrityError as error:
        db.rollback()
        if str(error.orig) == "UNIQUE constraint failed: comandas.mesa_id":
            existente = repository.obtener_abierta_por_mesa(db, datos.mesa_id)
            if existente is not None:
                raise ComandaAbiertaError(existente.id) from error
        raise
    except Exception:
        db.rollback()
        raise
    return salida


def _cotizar(
    db: Session, pedido: DetalleComandaCrear, catalogo: CatalogoPort
) -> DetalleComandaSalida:
    cotizacion = catalogo.cotizar(db, pedido.model_copy(deep=True))
    referencia = (cotizacion.producto_id, cotizacion.menu_ejecutivo_id, cotizacion.cantidad)
    if referencia != (pedido.producto_id, pedido.menu_ejecutivo_id, pedido.cantidad):
        raise DatosInvalidosError("Quote does not match the requested item and quantity")
    if cotizacion.estado_entrega != EstadoEntrega.PENDIENTE:
        raise DatosInvalidosError("New items must be PENDIENTE")
    for importe in (cotizacion.precio_unitario, cotizacion.descuento):
        if (
            not isinstance(importe, Decimal)
            or not importe.is_finite()
            or importe > Decimal("99999999.99")
        ):
            raise DatosInvalidosError("Quote amounts must be Decimal values fitting Numeric(10,2)")
    # Shared output serializers format money; validate native values before they round it.
    valores = {nombre: getattr(cotizacion, nombre) for nombre in DetalleComandaSalida.model_fields}
    return DetalleComandaSalida.model_validate(valores)


def listar_comandas(
    db: Session,
    parametros: ParametrosPaginacion,
    mesa_id: int | None = None,
    estado: EstadoComanda | None = None,
) -> Pagina[ComandaResumen]:
    comandas, total = repository.listar_comandas(db, parametros, mesa_id, estado)
    return Pagina(
        items=[
            ComandaResumen(
                id=comanda.id,
                mesa_id=comanda.mesa_id,
                estado=EstadoComanda(comanda.estado),
                fecha_hora=comanda.fecha_hora,
            )
            for comanda in comandas
        ],
        total=total,
        limit=parametros.limit,
        offset=parametros.offset,
    )


def cerrar_comanda(db: Session, comanda_id: int) -> ComandaSalida:
    comanda = repository.obtener_comanda(db, comanda_id)
    if comanda is None:
        raise NoEncontradoError(f"La comanda {comanda_id} no existe")
    if comanda.estado != EstadoComanda.ABIERTA:
        raise ReglaDeNegocioError("Solo se puede cerrar una comanda ABIERTA")
    pendientes = consultar_pendientes(db, comanda_id)
    if pendientes.pendientes:
        raise EntregasPendientesError(pendientes)
    try:
        comanda.estado = EstadoComanda.CERRADA
        salida = ComandaSalida.model_validate(comanda, from_attributes=True)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return salida


def modificar_cliente(db: Session, cliente_id: int, datos: ClienteModificar) -> ClienteSalida:
    cliente = repository.obtener_cliente(db, cliente_id)
    if cliente is None:
        raise NoEncontradoError(f"El cliente {cliente_id} no existe")
    cliente.nombre = datos.nombre
    cliente.telefono = datos.telefono
    db.commit()
    return ClienteSalida.model_validate(cliente)


def listar_clientes(
    db: Session, parametros: ParametrosPaginacion, q: str | None = None
) -> Pagina[ClienteSalida]:
    clientes, total = repository.listar_clientes(db, parametros, q)
    return Pagina[ClienteSalida](
        items=[ClienteSalida.model_validate(cliente) for cliente in clientes],
        total=total,
        limit=parametros.limit,
        offset=parametros.offset,
    )
