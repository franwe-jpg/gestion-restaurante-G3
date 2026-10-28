"""menus: reglas de negocio y transacciones."""

from typing import Protocol

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.menus import repository
from app.modules.menus.models import MenuEjecutivo
from app.modules.menus.schemas import (
    FiltroMenusEjecutivos,
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


def crear_menu_ejecutivo(db: Session, datos: MenuEjecutivoCrear) -> MenuEjecutivoSalida:
    seccion = _validar_seccion(db, datos.seccion_id)
    nombre_normalizado = normalizar_nombre(datos.nombre)
    if repository.existe_nombre_normalizado(db, nombre_normalizado):
        raise ReglaDeNegocioError("El nombre del menú ejecutivo ya existe")
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
