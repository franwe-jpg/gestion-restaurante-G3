"""pagos: reglas de negocio y transacciones."""

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import Row
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.atencion import service as atencion_service
from app.modules.menus import service as menus_service
from app.modules.pagos import comprobante_pdf, reporte, reporte_pdf, repository
from app.modules.pagos.models import Cobro, DetalleFactura, EstadoFactura, Factura, MedioPago
from app.modules.pagos.schemas import (
    AdeudadoSalida,
    CajaDelDiaSalida,
    CobradoPorMedio,
    CobroCrear,
    ComprobanteSalida,
    DetalleFacturaSalida,
    FacturaCrear,
    FacturaPrevia,
    FacturaResumenSalida,
    FacturaSalida,
    FiltroMediosPago,
    MedioPagoCrear,
    MedioPagoDelComprobante,
    MedioPagoModificar,
    MedioPagoSalida,
    ResumenRecaudacion,
)
from app.modules.productos import service as productos_service
from app.shared.contratos.comanda import ComandaSalida, DetalleComandaSalida, EstadoComanda
from app.shared.excepciones import DatosInvalidosError, NoEncontradoError, ReglaDeNegocioError
from app.shared.models import Estado
from app.shared.paginacion import Pagina, ParametrosPaginacion
from app.shared.pdf import renderizar

MENSAJE_DUPLICADO = "El medio de pago ya existe"
MENSAJE_NO_CERRADA = "La comanda no está cerrada"
MENSAJE_YA_FACTURADA = "La comanda ya fue facturada"
MENSAJE_FACTURA_PAGADA = "La factura ya está pagada"
MENSAJE_MONTO_SUPERA_SALDO = "El monto no puede superar el saldo pendiente de la factura"
MENSAJE_MEDIO_REPETIDO = "El medio de pago ya fue usado en esta factura"
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
    return FacturaSalida.model_validate(_obtener_factura_o_404(db, factura_id))


def _obtener_factura_o_404(db: Session, factura_id: int) -> Factura:
    factura = repository.obtener_factura(db, factura_id)
    if factura is None:
        raise NoEncontradoError(f"La factura {factura_id} no existe")
    return factura


def listar_facturas(db: Session, filtro: ParametrosPaginacion) -> Pagina[FacturaResumenSalida]:
    """HU-M6-02: pagina de facturas para elegir cual cobrar, la mas reciente primero."""
    facturas, total = repository.listar_facturas(db, filtro)
    return Pagina[FacturaResumenSalida](
        items=[FacturaResumenSalida.model_validate(factura) for factura in facturas],
        total=total,
        limit=filtro.limit,
        offset=filtro.offset,
    )


def _validar_cobro(db: Session, factura: Factura, datos: CobroCrear) -> None:
    if factura.estado == EstadoFactura.PAGADA:
        raise ReglaDeNegocioError(MENSAJE_FACTURA_PAGADA)
    if datos.monto > factura.saldo_pendiente:
        raise DatosInvalidosError(MENSAJE_MONTO_SUPERA_SALDO)
    _validar_medio_utilizable(db, datos.medio_pago_id)
    if repository.existe_cobro_con_medio(db, factura.id, datos.medio_pago_id):
        raise ReglaDeNegocioError(MENSAJE_MEDIO_REPETIDO)


def _aplicar_cobro(factura: Factura, datos: CobroCrear) -> Cobro:
    cobro = Cobro(medio_pago_id=datos.medio_pago_id, monto=datos.monto)
    factura.saldo_pendiente = (factura.saldo_pendiente - datos.monto).quantize(CENTAVO)
    factura.estado = (
        EstadoFactura.PAGADA
        if factura.saldo_pendiente == Decimal("0.00")
        else EstadoFactura.ADEUDADA
    )
    factura.cobros.append(cobro)
    return cobro


def registrar_cobro(db: Session, factura_id: int, datos: CobroCrear) -> FacturaSalida:
    """HU-M6-02: cobra una factura adeudada y actualiza saldo y estado."""
    factura = _obtener_factura_o_404(db, factura_id)
    _validar_cobro(db, factura, datos)
    cobro = _aplicar_cobro(factura, datos)
    try:
        repository.agregar_cobro(db, cobro)
        cobro.numero_comprobante = cobro.id
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise ReglaDeNegocioError("No se pudo registrar el cobro") from error
    return FacturaSalida.model_validate(factura)


@dataclass(frozen=True)
class ArchivoComprobante:
    contenido: bytes
    nombre: str


def obtener_comprobante(db: Session, numero_comprobante: int) -> ComprobanteSalida:
    """HU-M6-03: comprobante de un cobro; solo lee, asi que siempre es el mismo (CA4)."""
    cobro = repository.obtener_cobro_por_comprobante(db, numero_comprobante)
    if cobro is None:
        raise NoEncontradoError(
            f"No hay un pago registrado con el comprobante {numero_comprobante}"
        )
    medio = repository.obtener_medio_pago_aunque_eliminado(db, cobro.medio_pago_id)
    return ComprobanteSalida(
        numero_comprobante=numero_comprobante,
        fecha_hora=cobro.fecha_hora,
        monto=cobro.monto,
        medio_pago=MedioPagoDelComprobante.model_validate(medio),
        cobro_id=cobro.id,
        factura_id=cobro.factura_id,
        comanda_id=cobro.factura.comanda_id,
        total_factura=cobro.factura.total,
        saldo_pendiente=cobro.factura.saldo_pendiente,
    )


def generar_pdf_comprobante(db: Session, numero_comprobante: int) -> ArchivoComprobante:
    """HU-M6-03 (S3): el mismo comprobante en PDF, para entregarlo al cliente."""
    comprobante = obtener_comprobante(db, numero_comprobante)
    generado = datetime.now(comprobante_pdf.ZONA_DEL_RESTAURANTE).replace(tzinfo=None)
    documento = comprobante_pdf.componer(comprobante, generado)
    return ArchivoComprobante(
        contenido=renderizar(documento),
        nombre=f"comprobante-{comprobante.numero_comprobante}.pdf",
    )


def _ahora() -> datetime:
    return datetime.now(UTC)


def _redondear(valor: object) -> Decimal:
    """SQLite suma en coma flotante: se vuelve a 2 decimales."""
    return Decimal(str(valor)).quantize(CENTAVO)


def _cobrados_por_medio(filas: list[Row]) -> list[CobradoPorMedio]:
    return [
        CobradoPorMedio(
            medio_pago_id=fila.medio_pago_id,
            nombre=fila.nombre,
            tipo=fila.tipo,
            cantidad_cobros=fila.cantidad_cobros,
            monto=_redondear(fila.monto),
        )
        for fila in filas
    ]


def obtener_caja_del_dia(db: Session, ahora: datetime | None = None) -> CajaDelDiaSalida:
    """S4-06: lo cobrado hoy por medio de pago y lo adeudado; el dia es el del restaurante."""
    zona = comprobante_pdf.ZONA_DEL_RESTAURANTE
    hoy = (ahora or _ahora()).astimezone(zona).date()
    desde = datetime(hoy.year, hoy.month, hoy.day, tzinfo=zona).astimezone(UTC)
    filas = repository.sumar_cobros_por_medio(db, desde, desde + timedelta(days=1))
    por_medio = _cobrados_por_medio(filas)
    cantidad, saldo = repository.resumir_facturas_adeudadas(db)
    return CajaDelDiaSalida(
        fecha=hoy,
        por_medio_pago=por_medio,
        total_cobrado=sum((medio.monto for medio in por_medio), Decimal("0.00")),
        adeudado=AdeudadoSalida(cantidad_facturas=cantidad, monto=_redondear(saldo)),
    )


def generar_reporte_recaudacion(
    db: Session, fecha_desde: date | None, fecha_hasta: date | None
) -> ResumenRecaudacion:
    """HU-M6-08: cobrado por medio de pago y deuda de las facturas emitidas en el período.

    Solo lectura.
    """
    desde, hasta = reporte.validar_periodo(fecha_desde, fecha_hasta)
    inicio, fin = reporte.intervalo_utc(desde, hasta)
    por_medio = _cobrados_por_medio(repository.sumar_cobros_por_medio(db, inicio, fin))
    cantidad, saldo = repository.resumir_facturas_adeudadas(db, inicio, fin)
    adeudado = AdeudadoSalida(cantidad_facturas=cantidad, monto=_redondear(saldo))
    return reporte.armar_resumen(desde, hasta, por_medio, adeudado)


@dataclass(frozen=True)
class ArchivoReporte:
    contenido: bytes
    nombre: str


def generar_pdf_recaudacion(
    db: Session, fecha_desde: date | None, fecha_hasta: date | None
) -> ArchivoReporte:
    """HU-M6-08: el mismo reporte y las mismas validaciones, en PDF; un período vacío también."""
    resumen = generar_reporte_recaudacion(db, fecha_desde, fecha_hasta)
    generado = _ahora().astimezone(comprobante_pdf.ZONA_DEL_RESTAURANTE).replace(tzinfo=None)
    documento = reporte_pdf.componer(resumen, generado)
    periodo = f"{resumen.fecha_desde.isoformat()}_{resumen.fecha_hasta.isoformat()}"
    return ArchivoReporte(
        contenido=renderizar(documento), nombre=f"recaudacion-medio-pago_{periodo}.pdf"
    )
