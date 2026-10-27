"""menus: reglas de negocio y transacciones.

El menu del dia es un `Producto` con categoria MENU_DEL_DIA (D-05): la persistencia, la
unicidad por categoria y el manejo de imagenes viven en `productos.service`, que es lo unico
que otro modulo puede importar (contrato de importaciones, S0-05 seccion 3.3).
"""

from decimal import Decimal
from typing import Protocol

from sqlalchemy.orm import Session

from app.modules.menus.schemas import (
    MenuDelDiaCrear,
    MenuDelDiaListado,
    MenuDelDiaModificar,
    MenuDelDiaSalida,
    SeccionResumen,
)
from app.modules.productos import service as productos_service
from app.shared.models import Categoria, Estado
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


def _a_salida(producto: _ProductoConsultado) -> MenuDelDiaSalida:
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
    return _a_salida(producto)


def obtener_menu_del_dia(db: Session, menu_id: int) -> MenuDelDiaSalida:
    return _a_salida(productos_service.obtener_producto(db, CATEGORIA, menu_id))


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
    return _a_salida(producto)


def dar_de_baja_menu_del_dia(db: Session, menu_id: int) -> MenuDelDiaSalida:
    """Deshabilita sin borrar filas ni archivos (HU-M2-06)."""
    return _a_salida(productos_service.dar_de_baja_producto(db, CATEGORIA, menu_id))


def _a_listado(producto: _ProductoConsultado) -> MenuDelDiaListado:
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
        items=[_a_listado(producto) for producto in pagina.items],
        total=pagina.total,
        limit=pagina.limit,
        offset=pagina.offset,
    )
