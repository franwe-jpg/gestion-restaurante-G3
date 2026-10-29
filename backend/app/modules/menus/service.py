"""menus: reglas de negocio y transacciones."""

from typing import Protocol

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.menus import repository
from app.modules.menus.models import MenuEjecutivo
from app.modules.menus.schemas import (
    FiltroMenusEjecutivos,
    MenuEjecutivoActualizar,
    MenuEjecutivoCrear,
    MenuEjecutivoListado,
    MenuEjecutivoSalida,
    ProductoResumen,
    SeccionResumen,
)
from app.modules.productos import service as productos_service
from app.shared.excepciones import NoEncontradoError, ReglaDeNegocioError
from app.shared.models import Categoria, Estado, Producto
from app.shared.models.producto import normalizar_nombre
from app.shared.paginacion import Pagina


class SeccionDeCarta(Protocol):
    """Lo que menus necesita de una sección; productos solo expone su service (D-04)."""

    id: int
    nombre: str
    estado: Estado


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


def _a_salida(menu: MenuEjecutivo, seccion: SeccionDeCarta) -> MenuEjecutivoSalida:
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
    return _a_salida(menu, productos_service.obtener_seccion(db, menu.seccion_id))


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
    return _a_salida(menu, seccion)


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
    return _a_salida(menu, seccion)


def dar_de_baja_menu_ejecutivo(db: Session, menu_id: int) -> MenuEjecutivoSalida:
    """Deshabilita el menú sin borrar filas ni tocar el estado de sus productos (HU-M2-03)."""
    menu = _obtener_menu(db, menu_id)
    if menu.estado == Estado.DESHABILITADO:
        raise ReglaDeNegocioError("El menú ejecutivo ya está deshabilitado")
    menu.estado = Estado.DESHABILITADO
    db.commit()
    return _a_salida(menu, productos_service.obtener_seccion(db, menu.seccion_id))


def _a_listado(db: Session, menu: MenuEjecutivo) -> MenuEjecutivoListado:
    seccion = productos_service.obtener_seccion(db, menu.seccion_id)
    return MenuEjecutivoListado(**_a_salida(menu, seccion).model_dump())


def listar_menus_ejecutivos(
    db: Session, filtro: FiltroMenusEjecutivos
) -> Pagina[MenuEjecutivoListado]:
    menus, total = repository.listar(db, filtro, filtro.estado)
    return Pagina[MenuEjecutivoListado](
        items=[_a_listado(db, menu) for menu in menus],
        total=total,
        limit=filtro.limit,
        offset=filtro.offset,
    )
