"""pagos: reglas de negocio y transacciones."""

from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.atencion import service as atencion_service
from app.modules.menus import service as menus_service
from app.modules.pagos import repository
from app.modules.pagos.models import Cobro, DetalleFactura, EstadoFactura, Factura, MedioPago
from app.modules.pagos.schemas import (
    DetalleFacturaSalida,
    FacturaCrear,
    FacturaPrevia,
    FacturaSalida,
    FiltroMediosPago,
    MedioPagoCrear,
    MedioPagoModificar,
    MedioPagoSalida,
)
from app.modules.productos import service as productos_service
from app.shared.contratos.comanda import ComandaSalida, DetalleComandaSalida, EstadoComanda
from app.shared.excepciones import DatosInvalidosError, NoEncontradoError, ReglaDeNegocioError
from app.shared.models import Estado
from app.shared.paginacion import Pagina

MENSAJE_DUPLICADO = "El medio de pago ya existe"
MENSAJE_NO_CERRADA = "La comanda no está cerrada"
MENSAJE_YA_FACTURADA = "La comanda ya fue facturada"
CENTAVO = Decimal("0.01")


def _validar_nombre_libre(db: Session, nombre: str, excluir_id: int | None = None) -> None:
    if repository.existe_nombre_normalizado(db, nombre.strip().casefold(), excluir_id):
        raise ReglaDeNegocioError(MENSAJE_DUPLICADO)


def _obtener(db: Session, medio_pago_id: int) -> MedioPago:
    medio = repository.obtener_medio_pago(db, medio_pago_id)
    if medio is None:
        raise NoEncontradoError(f"El medio de pago {medio_pago_id} no existe")
    return medio


def _confirmar(db: Session, nuevo: MedioPago | None = None) -> None:
    """Agrega el medio nuevo (si hay) y confirma; un nombre repetido por carrera da 409."""
    try:
        if nuevo is not None:
            repository.agregar(db, nuevo)
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise ReglaDeNegocioError(MENSAJE_DUPLICADO) from error


def crear_medio_pago(db: Session, datos: MedioPagoCrear) -> MedioPagoSalida:
    """HU-M6-04: alta, siempre habilitado."""
    _validar_nombre_libre(db, datos.nombre)
    medio = MedioPago(
        nombre=datos.nombre,
        tipo=datos.tipo,
        descripcion=datos.descripcion,
        estado=Estado.HABILITADO,
    )
    _confirmar(db, medio)
    return MedioPagoSalida.model_validate(medio)


def modificar_medio_pago(
    db: Session, medio_pago_id: int, datos: MedioPagoModificar
) -> MedioPagoSalida:
    """HU-M6-05: reemplazo completo, incluido el estado."""
    medio = _obtener(db, medio_pago_id)
    _validar_nombre_libre(db, datos.nombre, medio.id)
    medio.nombre = datos.nombre
    medio.tipo = datos.tipo
    medio.descripcion = datos.descripcion
    medio.estado = datos.estado
    _confirmar(db)
    return MedioPagoSalida.model_validate(medio)


def eliminar_medio_pago(db: Session, medio_pago_id: int) -> None:
    """HU-M6-06: baja logica; la fila se conserva para los cobros que la usaron."""
    medio = _obtener(db, medio_pago_id)
    medio.eliminado = True
    db.commit()


def listar_medios_pago(db: Session, filtro: FiltroMediosPago) -> Pagina[MedioPagoSalida]:
    """HU-M6-07: por defecto solo los habilitados (S2); nunca los eliminados."""
    medios, total = repository.listar_medios_pago(db, filtro, filtro.incluir_deshabilitados)
    return Pagina[MedioPagoSalida](
        items=[MedioPagoSalida.model_validate(medio) for medio in medios],
        total=total,
        limit=filtro.limit,
        offset=filtro.offset,
    )


def _nombres_de_la_comanda(
    db: Session, comanda: ComandaSalida
) -> tuple[dict[int, str], dict[int, str]]:
    """Nombres de productos y menus de la comanda, por id (S4)."""
    ids_producto = sorted({d.producto_id for d in comanda.detalles if d.producto_id})
    productos = productos_service.obtener_productos_por_ids(db, ids_producto)
    menus = {
        id_: menus_service.obtener_menu_ejecutivo(db, id_).nombre
        for id_ in sorted({d.menu_ejecutivo_id for d in comanda.detalles if d.menu_ejecutivo_id})
    }
    return {producto.id: producto.nombre for producto in productos}, menus


def _a_detalle_factura(
    linea: DetalleComandaSalida, productos: dict[int, str], menus: dict[int, str]
) -> DetalleFactura:
    """Copia la linea de la comanda; subtotal = cantidad x precio - descuento (S5)."""
    nombre = (
        productos[linea.producto_id] if linea.producto_id else menus[linea.menu_ejecutivo_id or 0]
    )
    subtotal = (linea.cantidad * linea.precio_unitario - linea.descuento).quantize(CENTAVO)
    return DetalleFactura(
        producto_id=linea.producto_id,
        menu_ejecutivo_id=linea.menu_ejecutivo_id,
        descripcion=nombre,
        cantidad=linea.cantidad,
        precio_unitario=linea.precio_unitario,
        descuento=linea.descuento,
        subtotal=subtotal,
    )


def esta_facturada(db: Session, comanda_id: int) -> bool:
    """Indica si existe una factura asociada a la Comanda, sin importar su estado."""
    return repository.existe_factura_de_comanda(db, comanda_id)


def _preparar_detalles(db: Session, comanda_id: int) -> list[DetalleFactura]:
    """Valida que la comanda se pueda facturar y devuelve el detalle a copiar."""
    comanda = atencion_service.obtener_comanda(db, comanda_id)
    if comanda.estado != EstadoComanda.CERRADA:
        raise ReglaDeNegocioError(MENSAJE_NO_CERRADA)
    if repository.existe_factura_de_comanda(db, comanda_id):
        raise ReglaDeNegocioError(MENSAJE_YA_FACTURADA)
    productos, menus = _nombres_de_la_comanda(db, comanda)
    return [_a_detalle_factura(linea, productos, menus) for linea in comanda.detalles]


def previsualizar_factura(db: Session, comanda_id: int) -> FacturaPrevia:
    """HU-M6-01 CA1: detalle, fecha de emision y total, sin guardar nada."""
    detalles = _preparar_detalles(db, comanda_id)
    return FacturaPrevia(
        comanda_id=comanda_id,
        fecha_emision=datetime.now(UTC),
        total=sum((d.subtotal for d in detalles), Decimal("0.00")),
        detalles=[DetalleFacturaSalida.model_validate(d) for d in detalles],
    )


def _validar_medio_utilizable(db: Session, medio_pago_id: int) -> None:
    medio = repository.obtener_medio_pago(db, medio_pago_id)
    if medio is None:
        raise NoEncontradoError(f"El medio de pago {medio_pago_id} no existe")
    if medio.estado != Estado.HABILITADO:
        raise ReglaDeNegocioError("El medio de pago está deshabilitado")


def generar_factura(db: Session, datos: FacturaCrear) -> FacturaSalida:
    """HU-M6-01 CA2: factura, detalle y primer cobro en una sola transaccion."""
    detalles = _preparar_detalles(db, datos.comanda_id)
    total = sum((d.subtotal for d in detalles), Decimal("0.00"))
    _validar_medio_utilizable(db, datos.cobro.medio_pago_id)
    monto = datos.cobro.monto
    if monto > total:
        raise DatosInvalidosError("El monto no puede superar el total de la factura")
    saldo = total - monto
    cobro = Cobro(medio_pago_id=datos.cobro.medio_pago_id, monto=monto)
    factura = Factura(
        comanda_id=datos.comanda_id,
        total=total,
        saldo_pendiente=saldo,
        estado=EstadoFactura.PAGADA if saldo == 0 else EstadoFactura.ADEUDADA,
        detalles=detalles,
        cobros=[cobro],
    )
    try:
        repository.agregar_factura(db, factura)
        cobro.numero_comprobante = cobro.id
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise ReglaDeNegocioError(MENSAJE_YA_FACTURADA) from error
    return FacturaSalida.model_validate(factura)


def obtener_factura(db: Session, factura_id: int) -> FacturaSalida:
    factura = repository.obtener_factura(db, factura_id)
    if factura is None:
        raise NoEncontradoError(f"La factura {factura_id} no existe")
    return FacturaSalida.model_validate(factura)
