"""Servicios de Comanda y Cliente del módulo Atención."""

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Protocol

from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.atencion import repository
from app.modules.atencion.schemas import (
    ClienteModificar,
    ClienteNuevo,
    ClienteSalida,
    ComandaModificar,
    DetalleEntrega,
    DetallePendiente,
    EntregaDetalle,
    EntregasComanda,
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

    def liberar(self, db: Session, mesa_id: int) -> None:
        """OCUPADA -> LIBRE when the comanda closes; no commit, the caller owns it."""
        ...


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


def consultar_entregas(db: Session, comanda_id: int) -> EntregasComanda:
    comanda = repository.obtener_comanda(db, comanda_id)
    if comanda is None:
        raise NoEncontradoError(f"La comanda {comanda_id} no existe")
    return EntregasComanda(
        comanda_id=comanda.id,
        estado=EstadoComanda(comanda.estado),
        detalles=[
            DetalleEntrega.model_validate(detalle, from_attributes=True)
            for detalle in comanda.detalles
        ],
    )


def registrar_entrega(
    db: Session, comanda_id: int, detalle_id: int, datos: EntregaDetalle
) -> EntregasComanda:
    """Fija la cantidad entregada de un detalle de una comanda ABIERTA (HU-M4-08)."""
    try:
        registrada = repository.registrar_entrega(
            db, comanda_id, detalle_id, datos.cantidad_entregada
        )
        if registrada:
            db.commit()
    except Exception:
        db.rollback()
        raise
    if not registrada:
        db.rollback()
        _rechazar_entrega(db, comanda_id, detalle_id, datos.cantidad_entregada)
    return consultar_entregas(db, comanda_id)


def _rechazar_entrega(db: Session, comanda_id: int, detalle_id: int, cantidad: int) -> None:
    """Explica con lecturas por qué el UPDATE condicional no afectó ninguna fila."""
    comanda = repository.obtener_comanda(db, comanda_id)
    if comanda is None:
        raise NoEncontradoError(f"La comanda {comanda_id} no existe")
    detalle = next((d for d in comanda.detalles if d.id == detalle_id), None)
    if detalle is None:
        raise NoEncontradoError(f"El detalle {detalle_id} no existe en la comanda {comanda_id}")
    if comanda.estado != EstadoComanda.ABIERTA:
        raise ReglaDeNegocioError("Solo se pueden registrar entregas de una comanda ABIERTA")
    if cantidad > detalle.cantidad:
        raise DatosInvalidosError(
            f"La cantidad entregada no puede superar la cantidad pedida ({detalle.cantidad})"
        )
    raise ReglaDeNegocioError("El detalle cambió; vuelva a consultar las entregas")


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


def cerrar_comanda(db: Session, comanda_id: int, mesas: MesasPort) -> ComandaSalida:
    """ABIERTA -> CERRADA and frees its mesa in the same transaction (HU-M4-09)."""
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
        mesas.liberar(db, comanda.mesa_id)
        salida = ComandaSalida.model_validate(comanda, from_attributes=True)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return salida


def obtener_comanda(db: Session, comanda_id: int) -> ComandaSalida:
    comanda = repository.obtener_comanda(db, comanda_id)
    if comanda is None:
        raise NoEncontradoError(f"La comanda {comanda_id} no existe")
    return ComandaSalida.model_validate(comanda, from_attributes=True)


def modificar_comanda(
    db: Session, comanda_id: int, datos: ComandaModificar, catalogo: CatalogoPort
) -> ComandaSalida:
    """Agrega y quita líneas de una comanda ABIERTA sin tocar los históricos existentes."""
    comanda = repository.obtener_comanda(db, comanda_id)
    if comanda is None:
        raise NoEncontradoError(f"La comanda {comanda_id} no existe")
    if comanda.estado != EstadoComanda.ABIERTA:
        raise ReglaDeNegocioError("Solo se puede modificar una comanda ABIERTA")
    a_quitar = set(datos.quitar)
    existentes = {detalle.id for detalle in comanda.detalles}
    desconocidos = a_quitar - existentes
    if desconocidos:
        detalle_id = min(desconocidos)
        raise NoEncontradoError(f"El detalle {detalle_id} no existe en la comanda {comanda_id}")
    if len(existentes) - len(a_quitar) + len(datos.agregar) < 1:
        raise DatosInvalidosError("La comanda debe conservar al menos un detalle")
    nuevas = [_cotizar(db, detalle, catalogo) for detalle in datos.agregar]
    try:
        repository.quitar_detalles(db, comanda, a_quitar)
        repository.agregar_detalles(db, comanda, nuevas)
        salida = ComandaSalida.model_validate(comanda, from_attributes=True)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return salida


def reabrir_comanda(db: Session, comanda_id: int, mesas: MesasPort) -> ComandaSalida:
    """CERRADA -> ABIERTA y vuelve a ocupar su mesa en la misma transacción."""
    comanda = repository.obtener_comanda(db, comanda_id)
    if comanda is None:
        raise NoEncontradoError(f"La comanda {comanda_id} no existe")
    if comanda.estado != EstadoComanda.CERRADA:
        raise ReglaDeNegocioError("Solo se puede reabrir una comanda CERRADA")
    abierta = repository.obtener_abierta_por_mesa(db, comanda.mesa_id)
    if abierta is not None:
        raise ReglaDeNegocioError(f"La mesa {comanda.mesa_id} ya tiene una comanda ABIERTA")
    try:
        comanda.estado = EstadoComanda.ABIERTA
        mesas.ocupar(db, comanda.mesa_id)
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


def registrar_cliente_para_reserva(db: Session, nombre: str, telefono: str) -> int:
    """Interfaz para M5: valida y agrega el cliente en la sesión del llamador.

    Obtiene el `id` con `flush`; no hace `commit` ni `rollback`, M5 confirma o revierte
    junto con la reserva.
    """
    try:
        datos = ClienteNuevo(nombre=nombre, telefono=telefono)
    except ValidationError as error:
        raise DatosInvalidosError(_describir_error(error)) from error
    return repository.crear_cliente(db, datos.nombre, datos.telefono).id


def existe_cliente(db: Session, cliente_id: int) -> bool:
    return repository.obtener_cliente(db, cliente_id) is not None


def _describir_error(error: ValidationError) -> str:
    """Primer error como «campo: mensaje», sin el prefijo de pydantic ni el campo repetido."""
    primero = error.errors()[0]
    campo = str(primero["loc"][0]) if primero["loc"] else "datos"
    mensaje = primero["msg"].removeprefix("Value error, ").removeprefix(f"{campo} ")
    return f"{campo}: {mensaje}"


def promocion_fue_aplicada(db: Session, promocion_id: int) -> bool:
    """Lectura pública para M2: una promoción usada no se puede modificar (HU-M2-08)."""
    return repository.promocion_fue_aplicada(db, promocion_id)


@dataclass(frozen=True)
class CantidadPedidaPorFranja:
    """Unidades pedidas de un producto en un día de la semana y una hora locales."""

    producto_id: int
    dia_semana: int  # 0 = lunes ... 6 = domingo
    hora: int
    cantidad: int


def sumar_productos_pedidos(
    db: Session, desde: datetime, hasta: datetime, desplazamiento_horas: int
) -> list[CantidadPedidaPorFranja]:
    """Lectura pública para M1 (HU-M1-15): unidades pedidas por producto, día y hora locales.

    Cuentan las líneas de producto de comandas ABIERTA y CERRADA con
    `desde <= fecha_hora < hasta` (UTC). No hace `commit` ni cambia datos.
    """
    filas = repository.sumar_productos_pedidos(db, desde, hasta, desplazamiento_horas)
    return [CantidadPedidaPorFranja(*fila) for fila in filas]
