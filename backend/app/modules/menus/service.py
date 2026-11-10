"""menus: reglas de negocio y transacciones.

El menu del dia es un `Producto` con categoria MENU_DEL_DIA (D-05): la persistencia, la
unicidad por categoria y el manejo de imagenes viven en `productos.service`, que es lo unico
que otro modulo puede importar (contrato de importaciones, S0-05 seccion 3.3).
"""

from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Protocol

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.atencion import service as atencion_service
from app.modules.menus import promociones, reporte, repository
from app.modules.menus.models import DiaSemana, MenuEjecutivo, Promocion
from app.modules.menus.schemas import (
    FiltroMenusEjecutivos,
    FiltroPromociones,
    MenuDelDiaCrear,
    MenuDelDiaListado,
    MenuDelDiaModificar,
    MenuDelDiaSalida,
    MenuEjecutivoActualizar,
    MenuEjecutivoCrear,
    MenuEjecutivoListado,
    MenuEjecutivoSalida,
    ProductoResumen,
    PromocionCrear,
    PromocionListado,
    PromocionModificar,
    PromocionSalida,
    ReporteImpactoPromociones,
    SeccionResumen,
)
from app.modules.productos import service as productos_service
from app.shared.excepciones import NoEncontradoError, ReglaDeNegocioError
from app.shared.models import Categoria, Estado, Producto
from app.shared.models.producto import normalizar_nombre
from app.shared.paginacion import Pagina, ParametrosPaginacion

CATEGORIA = Categoria.MENU_DEL_DIA
MENSAJE_NOMBRE_REPETIDO = "El menú del día ya está registrado"


class _SeccionDeProducto(Protocol):
    id: int
    nombre: str


class _ProductoConsultado(Protocol):
    """Forma de lo que devuelve productos.service; el modulo no importa sus schemas."""

    id: int
    nombre: str
    categoria: Categoria
    precio: Decimal
    ingredientes: list[str]
    descripcion: str | None
    etiquetas: list[str]
    estado: Estado
    seccion: _SeccionDeProducto
    imagen_url: str | None


class SeccionDeCarta(Protocol):
    """Lo que menus necesita de una sección; productos solo expone su service (D-04)."""

    id: int
    nombre: str
    estado: Estado


def _a_salida_menu_del_dia(producto: _ProductoConsultado) -> MenuDelDiaSalida:
    return MenuDelDiaSalida(
        id=producto.id,
        nombre=producto.nombre,
        categoria=producto.categoria,
        precio=producto.precio,
        ingredientes=producto.ingredientes,
        descripcion=producto.descripcion,
        etiquetas=producto.etiquetas,
        estado=producto.estado,
        seccion=SeccionResumen(id=producto.seccion.id, nombre=producto.seccion.nombre),
        imagen_url=producto.imagen_url,
    )


def crear_menu_del_dia(
    db: Session, datos: MenuDelDiaCrear, imagen: bytes | None
) -> MenuDelDiaSalida:
    """Alta con todas las reglas de productos: seccion habilitada, nombre unico e imagen."""
    producto = productos_service.crear_producto_de_categoria(
        db,
        CATEGORIA,
        nombre=datos.nombre,
        seccion_id=datos.seccion_id,
        precio=datos.precio,
        ingredientes=datos.ingredientes,
        descripcion=datos.descripcion,
        etiquetas=datos.etiquetas,
        mensaje_nombre_repetido=MENSAJE_NOMBRE_REPETIDO,
        imagen=imagen,
    )
    return _a_salida_menu_del_dia(producto)


def obtener_menu_del_dia(db: Session, menu_id: int) -> MenuDelDiaSalida:
    return _a_salida_menu_del_dia(productos_service.obtener_producto(db, CATEGORIA, menu_id))


def modificar_menu_del_dia(
    db: Session, menu_id: int, datos: MenuDelDiaModificar, imagen: bytes | None
) -> MenuDelDiaSalida:
    """Modificacion completa; un id de otra categoria responde 404 (HU-M2-05)."""
    producto = productos_service.modificar_producto_de_categoria(
        db,
        CATEGORIA,
        menu_id,
        nombre=datos.nombre,
        seccion_id=datos.seccion_id,
        precio=datos.precio,
        ingredientes=datos.ingredientes,
        descripcion=datos.descripcion,
        etiquetas=datos.etiquetas,
        estado=datos.estado,
        quitar_imagen=datos.quitar_imagen,
        mensaje_nombre_repetido=MENSAJE_NOMBRE_REPETIDO,
        imagen=imagen,
    )
    return _a_salida_menu_del_dia(producto)


def dar_de_baja_menu_del_dia(db: Session, menu_id: int) -> MenuDelDiaSalida:
    """Deshabilita sin borrar filas ni archivos (HU-M2-06)."""
    return _a_salida_menu_del_dia(productos_service.dar_de_baja_producto(db, CATEGORIA, menu_id))


def _a_listado_menu_del_dia(producto: _ProductoConsultado) -> MenuDelDiaListado:
    return MenuDelDiaListado(
        id=producto.id,
        nombre=producto.nombre,
        descripcion=producto.descripcion,
        seccion=SeccionResumen(id=producto.seccion.id, nombre=producto.seccion.nombre),
        precio=producto.precio,
        estado=producto.estado,
        imagen_url=producto.imagen_url,
    )


def listar_menus_del_dia(
    db: Session, parametros: ParametrosPaginacion, estado: Estado | None
) -> Pagina[MenuDelDiaListado]:
    pagina = productos_service.listar_productos_de_categoria(db, parametros, CATEGORIA, estado)
    return Pagina[MenuDelDiaListado](
        items=[_a_listado_menu_del_dia(producto) for producto in pagina.items],
        total=pagina.total,
        limit=pagina.limit,
        offset=pagina.offset,
    )


def _validar_seccion(db: Session, seccion_id: int) -> SeccionDeCarta:
    seccion = productos_service.obtener_seccion(db, seccion_id)
    if seccion.estado != Estado.HABILITADO:
        raise ReglaDeNegocioError(f"La sección {seccion.nombre} está deshabilitada")
    return seccion


def _validar_seccion_si_cambia(db: Session, menu: MenuEjecutivo, seccion_id: int) -> SeccionDeCarta:
    """Conserva una sección que quedó deshabilitada; para mover el menú exige una habilitada."""
    if seccion_id == menu.seccion_id:
        return productos_service.obtener_seccion(db, seccion_id)
    return _validar_seccion(db, seccion_id)


def _validar_nombre_libre(db: Session, nombre: str, excluir_id: int | None = None) -> None:
    if repository.existe_nombre_normalizado(db, normalizar_nombre(nombre), excluir_id):
        raise ReglaDeNegocioError("El nombre del menú ejecutivo ya existe")


def _cargar_productos(db: Session, producto_ids: list[int]) -> list[Producto]:
    encontrados = repository.obtener_productos(db, producto_ids)
    por_id = {producto.id: producto for producto in encontrados}
    faltantes = [producto_id for producto_id in producto_ids if producto_id not in por_id]
    if faltantes:
        raise NoEncontradoError(f"El producto {faltantes[0]} no existe")
    return [por_id[producto_id] for producto_id in producto_ids]


def _validar_productos(productos: list[Producto]) -> None:
    for producto in productos:
        if producto.categoria == Categoria.MENU_DEL_DIA:
            raise ReglaDeNegocioError("No se pueden incluir menús del día en un menú ejecutivo")
        if producto.estado != Estado.HABILITADO:
            raise ReglaDeNegocioError("Solo se pueden incluir productos habilitados")


def _guardar(db: Session, menu: MenuEjecutivo) -> None:
    try:
        repository.agregar(db, menu)
        db.commit()
    except IntegrityError as error:
        db.rollback()
        if repository.existe_nombre_normalizado(db, menu.nombre_normalizado):
            raise ReglaDeNegocioError("El nombre del menú ejecutivo ya existe") from error
        raise
    except Exception:
        db.rollback()
        raise


def _resumen_producto(producto: Producto) -> ProductoResumen:
    return ProductoResumen(
        id=producto.id,
        nombre=producto.nombre,
        categoria=producto.categoria,
        estado=producto.estado,
    )


def _a_salida_menu_ejecutivo(menu: MenuEjecutivo, seccion: SeccionDeCarta) -> MenuEjecutivoSalida:
    return MenuEjecutivoSalida(
        id=menu.id,
        nombre=menu.nombre,
        descripcion=menu.descripcion,
        precio_fijo=menu.precio_fijo,
        estado=menu.estado,
        seccion=SeccionResumen(id=seccion.id, nombre=seccion.nombre),
        productos=[_resumen_producto(producto) for producto in menu.productos],
    )


def _obtener_menu(db: Session, menu_id: int) -> MenuEjecutivo:
    menu = repository.obtener(db, menu_id)
    if menu is None:
        raise NoEncontradoError(f"El menú ejecutivo {menu_id} no existe")
    return menu


def obtener_menu_ejecutivo(db: Session, menu_id: int) -> MenuEjecutivoSalida:
    menu = _obtener_menu(db, menu_id)
    return _a_salida_menu_ejecutivo(menu, productos_service.obtener_seccion(db, menu.seccion_id))


def crear_menu_ejecutivo(db: Session, datos: MenuEjecutivoCrear) -> MenuEjecutivoSalida:
    seccion = _validar_seccion(db, datos.seccion_id)
    _validar_nombre_libre(db, datos.nombre)
    productos = _cargar_productos(db, datos.producto_ids)
    _validar_productos(productos)
    menu = MenuEjecutivo(
        nombre=datos.nombre,
        descripcion=datos.descripcion,
        precio_fijo=datos.precio_fijo,
        estado=Estado.HABILITADO,
        seccion_id=seccion.id,
        productos=productos,
    )
    _guardar(db, menu)
    return _a_salida_menu_ejecutivo(menu, seccion)


def modificar_menu_ejecutivo(
    db: Session, menu_id: int, datos: MenuEjecutivoActualizar
) -> MenuEjecutivoSalida:
    """Reemplaza datos y composición; no toca comandas ni reportes ya generados (HU-M2-02)."""
    menu = _obtener_menu(db, menu_id)
    seccion = _validar_seccion_si_cambia(db, menu, datos.seccion_id)
    _validar_nombre_libre(db, datos.nombre, menu.id)
    productos = _cargar_productos(db, datos.producto_ids)
    _validar_productos(productos)
    menu.nombre = datos.nombre
    menu.descripcion = datos.descripcion
    menu.precio_fijo = datos.precio_fijo
    menu.seccion_id = seccion.id
    if datos.estado is not None:
        menu.estado = datos.estado
    menu.productos = productos
    _guardar(db, menu)
    return _a_salida_menu_ejecutivo(menu, seccion)


def dar_de_baja_menu_ejecutivo(db: Session, menu_id: int) -> MenuEjecutivoSalida:
    """Deshabilita el menú sin borrar filas ni tocar el estado de sus productos (HU-M2-03)."""
    menu = _obtener_menu(db, menu_id)
    if menu.estado == Estado.DESHABILITADO:
        raise ReglaDeNegocioError("El menú ejecutivo ya está deshabilitado")
    menu.estado = Estado.DESHABILITADO
    db.commit()
    return _a_salida_menu_ejecutivo(menu, productos_service.obtener_seccion(db, menu.seccion_id))


def _a_listado_menu_ejecutivo(db: Session, menu: MenuEjecutivo) -> MenuEjecutivoListado:
    seccion = productos_service.obtener_seccion(db, menu.seccion_id)
    return MenuEjecutivoListado(**_a_salida_menu_ejecutivo(menu, seccion).model_dump())


def listar_menus_ejecutivos(
    db: Session, filtro: FiltroMenusEjecutivos
) -> Pagina[MenuEjecutivoListado]:
    menus, total = repository.listar(db, filtro, filtro.estado)
    return Pagina[MenuEjecutivoListado](
        items=[_a_listado_menu_ejecutivo(db, menu) for menu in menus],
        total=total,
        limit=filtro.limit,
        offset=filtro.offset,
    )


MENSAJE_NOMBRE_PROMOCION_REPETIDO = "El nombre de la promoción ya existe"


def _validar_nombre_promocion_libre(
    db: Session, nombre: str, excluir_id: int | None = None
) -> None:
    if repository.existe_nombre_promocion(db, normalizar_nombre(nombre), excluir_id):
        raise ReglaDeNegocioError(MENSAJE_NOMBRE_PROMOCION_REPETIDO)


def _validar_productos_promocion(productos: list[Producto]) -> None:
    for producto in productos:
        if producto.estado != Estado.HABILITADO:
            raise ReglaDeNegocioError("Solo se pueden incluir productos habilitados")


def _guardar_promocion(db: Session, promocion: Promocion) -> None:
    try:
        repository.agregar_promocion(db, promocion)
        db.commit()
    except IntegrityError as error:
        db.rollback()
        if repository.existe_nombre_promocion(db, promocion.nombre_normalizado):
            raise ReglaDeNegocioError(MENSAJE_NOMBRE_PROMOCION_REPETIDO) from error
        raise
    except Exception:
        db.rollback()
        raise


def _a_salida_promocion(promocion: Promocion) -> PromocionSalida:
    return PromocionSalida(
        id=promocion.id,
        nombre=promocion.nombre,
        tipo=promocion.tipo,
        descripcion=promocion.descripcion,
        fecha_desde=promocion.fecha_desde,
        fecha_hasta=promocion.fecha_hasta,
        dias_semana=[DiaSemana(dia) for dia in promocion.dias_semana],
        hora_desde=promocion.hora_desde,
        hora_hasta=promocion.hora_hasta,
        descuento_porcentaje=promocion.descuento_porcentaje,
        precio_fijo=promocion.precio_fijo,
        cant_lleva=promocion.cant_lleva,
        cant_paga=promocion.cant_paga,
        estado=promocion.estado,
        fecha_hora_finalizacion=promocion.fecha_hora_finalizacion,
        productos=[_resumen_producto(producto) for producto in promocion.productos],
    )


def crear_promocion(db: Session, datos: PromocionCrear) -> PromocionSalida:
    """Registra una promoción habilitada y la asocia a sus productos (HU-M2-07)."""
    _validar_nombre_promocion_libre(db, datos.nombre)
    productos = _cargar_productos(db, datos.producto_ids)
    _validar_productos_promocion(productos)
    promocion = Promocion(
        nombre=datos.nombre,
        tipo=datos.tipo,
        descripcion=datos.descripcion,
        fecha_desde=datos.fecha_desde,
        fecha_hasta=datos.fecha_hasta,
        dias_semana=[dia.value for dia in datos.dias_semana],
        hora_desde=datos.hora_desde,
        hora_hasta=datos.hora_hasta,
        descuento_porcentaje=datos.descuento_porcentaje,
        precio_fijo=datos.precio_fijo,
        cant_lleva=datos.cant_lleva,
        cant_paga=datos.cant_paga,
        estado=Estado.HABILITADO,
        productos=productos,
    )
    _guardar_promocion(db, promocion)
    return _a_salida_promocion(promocion)


def modificar_promocion(
    db: Session, promocion_id: int, datos: PromocionModificar
) -> PromocionSalida:
    """Reemplaza las condiciones de una promoción habilitada y no aplicada (HU-M2-08)."""
    promocion = repository.obtener_promocion(db, promocion_id)
    if promocion is None:
        raise NoEncontradoError(f"La promoción {promocion_id} no existe")
    if promocion.estado == Estado.DESHABILITADO:
        raise ReglaDeNegocioError("La promoción está finalizada y no se puede modificar")
    if atencion_service.promocion_fue_aplicada(db, promocion_id):
        raise ReglaDeNegocioError(
            "La promoción ya fue aplicada en una comanda; finalizala y creá una nueva"
        )
    _validar_nombre_promocion_libre(db, datos.nombre, promocion.id)
    productos = _cargar_productos(db, datos.producto_ids)
    _validar_productos_promocion(productos)
    promocion.nombre = datos.nombre
    promocion.tipo = datos.tipo
    promocion.descripcion = datos.descripcion
    promocion.fecha_desde = datos.fecha_desde
    promocion.fecha_hasta = datos.fecha_hasta
    promocion.dias_semana = [dia.value for dia in datos.dias_semana]
    promocion.hora_desde = datos.hora_desde
    promocion.hora_hasta = datos.hora_hasta
    promocion.descuento_porcentaje = datos.descuento_porcentaje
    promocion.precio_fijo = datos.precio_fijo
    promocion.cant_lleva = datos.cant_lleva
    promocion.cant_paga = datos.cant_paga
    promocion.productos = productos
    _guardar_promocion(db, promocion)
    return _a_salida_promocion(promocion)


def finalizar_promocion(db: Session, promocion_id: int) -> PromocionSalida:
    """Deshabilita una promoción y registra el instante de la interrupción (HU-M2-09)."""
    promocion = repository.obtener_promocion(db, promocion_id)
    if promocion is None:
        raise NoEncontradoError(f"La promoción {promocion_id} no existe")
    if promocion.estado == Estado.DESHABILITADO:
        raise ReglaDeNegocioError("La promoción ya está finalizada")
    promocion.estado = Estado.DESHABILITADO
    promocion.fecha_hora_finalizacion = datetime.now(UTC)
    db.commit()
    return _a_salida_promocion(promocion)


def listar_promociones(db: Session, filtro: FiltroPromociones) -> Pagina[PromocionListado]:
    promociones, total = repository.listar_promociones(db, filtro, filtro.estado)
    return Pagina[PromocionListado](
        items=[
            PromocionListado(**_a_salida_promocion(promocion).model_dump())
            for promocion in promociones
        ],
        total=total,
        limit=filtro.limit,
        offset=filtro.offset,
    )


def promocion_para_linea(
    db: Session,
    *,
    producto_id: int | None,
    menu_ejecutivo_id: int | None,
    precio_unitario: Decimal,
    cantidad: int,
    momento: datetime,
) -> promociones.PromocionAplicable | None:
    """Promocion vigente de la linea y su descuento absoluto; solo lectura (S4-02).

    Las promociones se asocian solo a Producto (incluye MENU_DEL_DIA): un menu ejecutivo
    no recibe promocion.
    """
    if producto_id is None or menu_ejecutivo_id is not None:
        return None
    fecha_local = promociones.momento_local(momento).date()
    vigentes = repository.promociones_del_producto(db, producto_id, fecha_local)
    return promociones.elegir_promocion(vigentes, precio_unitario, cantidad, momento)


def generar_reporte_impacto_promociones(
    db: Session,
    fecha_desde: date | None,
    fecha_hasta: date | None,
    promocion_id: int | None,
) -> ReporteImpactoPromociones:
    """Impacto de una promoción en las ventas diarias de sus productos (HU-M2-10)."""
    desde, hasta = reporte.validar_periodo(fecha_desde, fecha_hasta)
    promocion = repository.obtener_promocion(db, reporte.validar_promocion(promocion_id))
    if promocion is None:
        raise NoEncontradoError(f"La promoción {promocion_id} no existe")
    inicio, fin = reporte.intervalo_utc(desde, hasta)
    ventas = atencion_service.sumar_ventas_de_promocion_por_producto_y_fecha(
        db,
        inicio,
        fin,
        [producto.id for producto in promocion.productos],
        promocion.id,
        reporte.DESPLAZAMIENTO_HORAS,
    )
    return reporte.armar_reporte(promocion, desde, hasta, ventas)
