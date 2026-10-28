"""productos: reglas de negocio y transacciones."""

import contextlib
from collections.abc import Sequence
from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.productos import imagenes, repository
from app.modules.productos.models import Seccion
from app.modules.productos.schemas import (
    ProductoCarta,
    ProductoCrear,
    ProductoListado,
    ProductoModificar,
    ProductoResumen,
    ProductoSalida,
    SeccionCarta,
    SeccionCrear,
    SeccionListado,
    SeccionModificar,
    SeccionResumen,
    SeccionSalida,
)
from app.shared.excepciones import DatosInvalidosError, NoEncontradoError, ReglaDeNegocioError
from app.shared.models import Categoria, Estado, Producto
from app.shared.models.producto import normalizar_nombre
from app.shared.paginacion import Pagina, ParametrosPaginacion

MENSAJE_NOMBRE_REPETIDO_POR_DEFECTO = "El producto ya está registrado"


class _DatosProducto(Protocol):
    """Campos de alta que comparten los schemas y los valores que manda otro modulo (M2)."""

    nombre: str
    seccion_id: int
    precio: Decimal
    ingredientes: list[str]
    descripcion: str | None
    etiquetas: list[str]


class _DatosProductoModificar(_DatosProducto, Protocol):
    estado: Estado | None
    quitar_imagen: bool


@dataclass(frozen=True)
class _ValoresProducto:
    """Valores simples para el alta y la modificacion desde otro modulo (M2, D-03)."""

    nombre: str
    seccion_id: int
    precio: Decimal
    ingredientes: list[str]
    descripcion: str | None
    etiquetas: list[str]
    estado: Estado | None = None
    quitar_imagen: bool = False


def _validar_nombre_libre(db: Session, nombre: str, excluir_id: int | None = None) -> None:
    if repository.existe_nombre_normalizado(db, nombre.casefold(), excluir_id):
        raise ReglaDeNegocioError("La sección ya existe")


def _validar_orden_libre(db: Session, orden: int, excluir_id: int | None = None) -> None:
    if repository.buscar_habilitada_por_orden(db, orden, excluir_id) is not None:
        raise ReglaDeNegocioError("Posición ocupada: otra sección habilitada usa ese orden")


def _cargar_productos(db: Session, ids: list[int]) -> list[Producto]:
    productos = repository.obtener_productos(db, ids)
    encontrados = {producto.id for producto in productos}
    faltantes = [id_ for id_ in ids if id_ not in encontrados]
    if faltantes:
        raise NoEncontradoError(f"El producto {faltantes[0]} no existe")
    return sorted(productos, key=lambda producto: ids.index(producto.id))


def _validar_habilitados(productos: list[Producto]) -> None:
    for producto in productos:
        if producto.estado != Estado.HABILITADO:
            raise ReglaDeNegocioError(f"El producto {producto.nombre} está deshabilitado")


def _validar_traslado(db: Session, productos: list[Producto], confirmado: bool) -> None:
    if productos and not confirmado:
        primero = productos[0]
        actual = repository.obtener_nombre_de_seccion(db, primero.seccion_id)
        raise ReglaDeNegocioError(
            f"El producto {primero.nombre} pertenece a la sección {actual}: "
            "confirme el traslado para moverlo"
        )


def _confirmar_seccion(db: Session, seccion: Seccion) -> None:
    """Confirma el cambio de una seccion; el indice parcial de orden respalda el 409 (A3, H6)."""
    try:
        repository.agregar(db, seccion)
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise ReglaDeNegocioError("La sección ya existe o la posición está ocupada") from error


def _guardar(db: Session, datos: SeccionCrear, productos: list[Producto]) -> Seccion:
    seccion = Seccion(nombre=datos.nombre, orden=datos.orden, estado=Estado.HABILITADO)
    seccion.productos = productos
    _confirmar_seccion(db, seccion)
    return seccion


def _a_salida_seccion(seccion: Seccion) -> SeccionSalida:
    return SeccionSalida(
        id=seccion.id,
        nombre=seccion.nombre,
        orden=seccion.orden,
        estado=seccion.estado,
        productos=[ProductoResumen.model_validate(producto) for producto in seccion.productos],
        productos_habilitados=sum(p.estado == Estado.HABILITADO for p in seccion.productos),
    )


def crear_seccion(db: Session, datos: SeccionCrear) -> SeccionSalida:
    _validar_nombre_libre(db, datos.nombre)
    _validar_orden_libre(db, datos.orden)
    productos = _cargar_productos(db, datos.producto_ids)
    _validar_habilitados(productos)
    _validar_traslado(db, productos, datos.confirmar_traslado)
    return _a_salida_seccion(_guardar(db, datos, productos))


def _obtener_seccion(db: Session, seccion_id: int) -> Seccion:
    seccion = repository.obtener_seccion(db, seccion_id)
    if seccion is None:
        raise NoEncontradoError(f"La sección {seccion_id} no existe")
    return seccion


def obtener_seccion(db: Session, seccion_id: int) -> SeccionSalida:
    return _a_salida_seccion(_obtener_seccion(db, seccion_id))


def _validar_agregado_en_deshabilitada(seccion: Seccion, estado: Estado, hay_nuevos: bool) -> None:
    """No se agregan productos a una seccion que queda deshabilitada (S76)."""
    if hay_nuevos and estado != Estado.HABILITADO:
        raise ReglaDeNegocioError(f"La sección {seccion.nombre} está deshabilitada")


def _aplicar_cambios_seccion(
    seccion: Seccion, datos: SeccionModificar, estado: Estado, productos: list[Producto]
) -> None:
    """Muta recien tras validar todo: el autoflush no debe tocar el indice a mitad de camino."""
    seccion.nombre = datos.nombre
    seccion.orden = datos.orden
    seccion.estado = estado
    seccion.productos = [*seccion.productos, *productos]


def modificar_seccion(db: Session, seccion_id: int, datos: SeccionModificar) -> SeccionSalida:
    """Modificacion de una seccion; los productos solo se agregan (S62). Orden de validacion: H3."""
    seccion = _obtener_seccion(db, seccion_id)
    estado = datos.estado or seccion.estado
    _validar_nombre_libre(db, datos.nombre, seccion.id)
    if estado == Estado.HABILITADO:
        _validar_orden_libre(db, datos.orden, seccion.id)
    actuales = {producto.id for producto in seccion.productos}
    nuevos = [id_ for id_ in datos.producto_ids if id_ not in actuales]
    _validar_agregado_en_deshabilitada(seccion, estado, bool(nuevos))
    productos = _cargar_productos(db, nuevos)
    _validar_habilitados(productos)
    _validar_traslado(db, productos, datos.confirmar_traslado)
    _aplicar_cambios_seccion(seccion, datos, estado, productos)
    _confirmar_seccion(db, seccion)
    return _a_salida_seccion(seccion)


def dar_de_baja_seccion(db: Session, seccion_id: int) -> SeccionSalida:
    """Deshabilita la seccion sin tocar sus productos (H7)."""
    seccion = _obtener_seccion(db, seccion_id)
    if seccion.estado == Estado.DESHABILITADO:
        raise ReglaDeNegocioError("La sección ya está deshabilitada")
    seccion.estado = Estado.DESHABILITADO
    db.commit()
    return _a_salida_seccion(seccion)


def _validar_seccion_habilitada(db: Session, seccion_id: int) -> Seccion:
    seccion = _obtener_seccion(db, seccion_id)
    if seccion.estado != Estado.HABILITADO:
        raise ReglaDeNegocioError(f"La sección {seccion.nombre} está deshabilitada")
    return seccion


def _validar_producto_libre(
    db: Session,
    categoria: Categoria,
    datos: _DatosProducto,
    mensaje: str,
    excluir_id: int | None = None,
) -> None:
    if repository.existe_producto(db, categoria, normalizar_nombre(datos.nombre), excluir_id):
        raise ReglaDeNegocioError(mensaje)


def _armar_producto(categoria: Categoria, datos: _DatosProducto, archivo: str | None) -> Producto:
    return Producto(
        nombre=datos.nombre,
        categoria=categoria,
        precio=datos.precio,
        ingredientes=datos.ingredientes,
        descripcion=datos.descripcion,
        imagen=archivo,
        etiquetas=datos.etiquetas,
        estado=Estado.HABILITADO,
        seccion_id=datos.seccion_id,
    )


def _guardar_producto(
    db: Session, producto: Producto, mensaje_repetido: str, archivo_nuevo: str | None
) -> None:
    """Confirma el cambio; ante cualquier error deshace la transaccion y borra solo el archivo
    recien escrito (S7, E4). La imagen conservada de una modificacion nunca se borra."""
    archivo = archivo_nuevo
    try:
        repository.agregar(db, producto)
        db.commit()
    except IntegrityError as error:
        _descartar(db, archivo)
        raise ReglaDeNegocioError(mensaje_repetido) from error
    except Exception:
        _descartar(db, archivo)
        raise


def _descartar(db: Session, archivo: str | None) -> None:
    db.rollback()
    if archivo:
        imagenes.borrar(archivo)


def _url_de_imagen(producto: Producto) -> str | None:
    return f"/media/{producto.imagen}" if producto.imagen else None


def _a_salida(producto: Producto, seccion: Seccion) -> ProductoSalida:
    return ProductoSalida(
        id=producto.id,
        nombre=producto.nombre,
        categoria=producto.categoria,
        precio=producto.precio,
        ingredientes=producto.ingredientes,
        descripcion=producto.descripcion,
        etiquetas=producto.etiquetas,
        estado=producto.estado,
        seccion=SeccionResumen(id=seccion.id, nombre=seccion.nombre),
        imagen_url=_url_de_imagen(producto),
    )


def _crear_producto(
    db: Session,
    categoria: Categoria,
    datos: _DatosProducto,
    mensaje: str,
    imagen: bytes | None,
) -> ProductoSalida:
    """Alta comun a los endpoints por categoria y a la API publica para otros modulos (D-03)."""
    procesada = imagenes.procesar(imagen) if imagen is not None else None
    seccion = _validar_seccion_habilitada(db, datos.seccion_id)
    _validar_producto_libre(db, categoria, datos, mensaje)
    archivo = imagenes.guardar(procesada) if procesada else None
    producto = _armar_producto(categoria, datos, archivo)
    _guardar_producto(db, producto, mensaje, archivo)
    return _a_salida(producto, seccion)


def crear_producto(db: Session, datos: ProductoCrear, imagen: bytes | None) -> ProductoSalida:
    """Alta compartida de platos, postres y bebidas. Orden de validacion: B6."""
    return _crear_producto(db, datos.CATEGORIA, datos, datos.MENSAJE_NOMBRE_REPETIDO, imagen)


def crear_producto_de_categoria(
    db: Session,
    categoria: Categoria,
    *,
    nombre: str,
    seccion_id: int,
    precio: Decimal,
    ingredientes: list[str],
    descripcion: str | None,
    etiquetas: list[str],
    mensaje_nombre_repetido: str = MENSAJE_NOMBRE_REPETIDO_POR_DEFECTO,
    imagen: bytes | None = None,
) -> ProductoSalida:
    """Alta para otro modulo que fija la categoria en la llamada (M2, HU-M2-04).

    Recibe valores simples para que el modulo que llama no importe estos schemas
    (contrato de importaciones, S0-05 seccion 3.3). Las reglas son las mismas del alta.
    """
    datos = _ValoresProducto(
        nombre=nombre.strip(),
        seccion_id=seccion_id,
        precio=precio,
        ingredientes=ingredientes,
        descripcion=descripcion,
        etiquetas=etiquetas,
    )
    return _crear_producto(db, categoria, datos, mensaje_nombre_repetido, imagen)


def _obtener_de_categoria(db: Session, categoria: Categoria, producto_id: int) -> Producto:
    producto = repository.obtener_producto(db, categoria, producto_id)
    if producto is None:
        raise NoEncontradoError(f"El producto {producto_id} no existe")
    return producto


def obtener_producto(db: Session, categoria: Categoria, producto_id: int) -> ProductoSalida:
    producto = _obtener_de_categoria(db, categoria, producto_id)
    return _a_salida(producto, repository.obtener_seccion(db, producto.seccion_id))


def _validar_imagen_pedida(quitar_imagen: bool, imagen: bytes | None) -> None:
    if quitar_imagen and imagen is not None:
        raise DatosInvalidosError("No se puede quitar y reemplazar la imagen a la vez")


def _validar_seccion_si_cambia(db: Session, producto: Producto, datos: _DatosProducto) -> Seccion:
    """Solo se valida si la seccion cambia: puede seguir deshabilitada (S19)."""
    if datos.seccion_id == producto.seccion_id:
        return repository.obtener_seccion(db, producto.seccion_id)
    return _validar_seccion_habilitada(db, datos.seccion_id)


def _aplicar_cambios(
    producto: Producto, datos: _DatosProductoModificar, archivo_nuevo: str | None
) -> None:
    """Asigna listas nuevas (no muta en el lugar) para que las columnas JSON detecten el cambio."""
    producto.nombre = datos.nombre
    producto.seccion_id = datos.seccion_id
    producto.precio = datos.precio
    producto.ingredientes = datos.ingredientes
    producto.descripcion = datos.descripcion
    producto.etiquetas = datos.etiquetas
    if datos.estado is not None:
        producto.estado = datos.estado
    if archivo_nuevo is not None:
        producto.imagen = archivo_nuevo
    elif datos.quitar_imagen:
        producto.imagen = None


def _borrar_anterior(archivo: str | None) -> None:
    """Un fallo al borrar deja un archivo huerfano, pero la base ya confirmo el cambio (E3)."""
    if archivo is None:
        return
    with contextlib.suppress(OSError):
        imagenes.borrar(archivo)


def _modificar_producto(
    db: Session,
    categoria: Categoria,
    producto_id: int,
    datos: _DatosProductoModificar,
    mensaje: str,
    imagen: bytes | None,
) -> ProductoSalida:
    """Modificacion comun a los endpoints por categoria y a la API publica (D-03)."""
    _validar_imagen_pedida(datos.quitar_imagen, imagen)
    procesada = imagenes.procesar(imagen) if imagen is not None else None
    producto = _obtener_de_categoria(db, categoria, producto_id)
    seccion = _validar_seccion_si_cambia(db, producto, datos)
    _validar_producto_libre(db, categoria, datos, mensaje, producto.id)
    archivo = imagenes.guardar(procesada) if procesada else None
    anterior = producto.imagen
    _aplicar_cambios(producto, datos, archivo)
    _guardar_producto(db, producto, mensaje, archivo)
    if producto.imagen != anterior:
        _borrar_anterior(anterior)
    return _a_salida(producto, seccion)


def modificar_producto(
    db: Session, producto_id: int, datos: ProductoModificar, imagen: bytes | None
) -> ProductoSalida:
    """Modificacion compartida (reemplazo completo). Orden de validacion: E6."""
    return _modificar_producto(
        db, datos.CATEGORIA, producto_id, datos, datos.MENSAJE_NOMBRE_REPETIDO, imagen
    )


def modificar_producto_de_categoria(
    db: Session,
    categoria: Categoria,
    producto_id: int,
    *,
    nombre: str,
    seccion_id: int,
    precio: Decimal,
    ingredientes: list[str],
    descripcion: str | None,
    etiquetas: list[str],
    estado: Estado | None = None,
    quitar_imagen: bool = False,
    mensaje_nombre_repetido: str = MENSAJE_NOMBRE_REPETIDO_POR_DEFECTO,
    imagen: bytes | None = None,
) -> ProductoSalida:
    """Modificacion para otro modulo que fija la categoria (M2, HU-M2-05).

    Un id de otra categoria responde 404, igual que los endpoints por categoria.
    """
    datos = _ValoresProducto(
        nombre=nombre.strip(),
        seccion_id=seccion_id,
        precio=precio,
        ingredientes=ingredientes,
        descripcion=descripcion,
        etiquetas=etiquetas,
        estado=estado,
        quitar_imagen=quitar_imagen,
    )
    return _modificar_producto(db, categoria, producto_id, datos, mensaje_nombre_repetido, imagen)


def obtener_productos_por_ids(db: Session, ids: Sequence[int]) -> list[ProductoSalida]:
    """Productos por id, en el orden pedido, incluidos los deshabilitados (M2 los valida).

    Si algun id no existe responde 404 nombrando el primero que falta, igual que
    `_cargar_productos` en las secciones.
    """
    encontrados = {producto.id: producto for producto in repository.obtener_productos(db, ids)}
    faltantes = [id_ for id_ in ids if id_ not in encontrados]
    if faltantes:
        raise NoEncontradoError(f"El producto {faltantes[0]} no existe")
    secciones = repository.obtener_secciones_por_ids(
        db, {producto.seccion_id for producto in encontrados.values()}
    )
    return [_a_salida(encontrados[id_], secciones[encontrados[id_].seccion_id]) for id_ in ids]


def dar_de_baja_producto(db: Session, categoria: Categoria, producto_id: int) -> ProductoSalida:
    """Deshabilita el producto sin borrar filas ni archivos (S18, S20, S21)."""
    producto = _obtener_de_categoria(db, categoria, producto_id)
    if producto.estado == Estado.DESHABILITADO:
        raise ReglaDeNegocioError("El producto ya está deshabilitado")
    producto.estado = Estado.DESHABILITADO
    db.commit()
    return _a_salida(producto, repository.obtener_seccion(db, producto.seccion_id))


def listar_secciones(
    db: Session, parametros: ParametrosPaginacion, estado: Estado | None = None
) -> Pagina[SeccionListado]:
    filas, total = repository.listar_secciones(db, parametros, estado)
    items = [
        SeccionListado(
            id=seccion.id,
            nombre=seccion.nombre,
            orden=seccion.orden,
            estado=seccion.estado,
            cantidad_productos=cantidad,
            productos_habilitados=habilitados,
        )
        for seccion, cantidad, habilitados in filas
    ]
    return Pagina[SeccionListado](
        items=items, total=total, limit=parametros.limit, offset=parametros.offset
    )


def _a_listado(producto: Producto, seccion: Seccion) -> ProductoListado:
    return ProductoListado(
        id=producto.id,
        nombre=producto.nombre,
        categoria=producto.categoria,
        seccion=SeccionResumen(id=seccion.id, nombre=seccion.nombre),
        precio=producto.precio,
        etiquetas=producto.etiquetas,
        estado=producto.estado,
    )


def listar_productos(
    db: Session, parametros: ParametrosPaginacion, estado: Estado | None = Estado.HABILITADO
) -> Pagina[ProductoListado]:
    """Lista productos de M1; menus del dia se listan por separado en M2."""
    filas, total = repository.listar_productos(
        db, parametros, estado, categoria_excluida=Categoria.MENU_DEL_DIA
    )
    return Pagina[ProductoListado](
        items=[_a_listado(producto, seccion) for producto, seccion in filas],
        total=total,
        limit=parametros.limit,
        offset=parametros.offset,
    )


def listar_productos_de_categoria(
    db: Session,
    parametros: ParametrosPaginacion,
    categoria: Categoria,
    estado: Estado | None = Estado.HABILITADO,
) -> Pagina[ProductoSalida]:
    """Listado con todos los datos de una categoria, para el modulo que la expone (M2)."""
    filas, total = repository.listar_productos(db, parametros, estado, categoria)
    return Pagina[ProductoSalida](
        items=[_a_salida(producto, seccion) for producto, seccion in filas],
        total=total,
        limit=parametros.limit,
        offset=parametros.offset,
    )


def _a_producto_carta(producto: Producto) -> ProductoCarta:
    return ProductoCarta(
        id=producto.id,
        nombre=producto.nombre,
        categoria=producto.categoria,
        precio=producto.precio,
        descripcion=producto.descripcion,
        etiquetas=producto.etiquetas,
        imagen_url=_url_de_imagen(producto),
        estado=producto.estado,
    )


def listar_carta(
    db: Session, parametros: ParametrosPaginacion, estado: Estado | None
) -> Pagina[SeccionCarta]:
    """Carta por secciones con sus productos: tres sentencias SQL como maximo (I3, I7)."""
    secciones, total = repository.listar_secciones_de_carta(db, parametros, estado)
    por_seccion: dict[int, list[ProductoCarta]] = {seccion.id: [] for seccion in secciones}
    if secciones:
        for producto in repository.listar_productos_de_secciones(db, list(por_seccion), estado):
            por_seccion[producto.seccion_id].append(_a_producto_carta(producto))
    items = [
        SeccionCarta(
            id=seccion.id,
            nombre=seccion.nombre,
            orden=seccion.orden,
            estado=seccion.estado,
            productos=por_seccion[seccion.id],
        )
        for seccion in secciones
    ]
    return Pagina[SeccionCarta](
        items=items, total=total, limit=parametros.limit, offset=parametros.offset
    )
