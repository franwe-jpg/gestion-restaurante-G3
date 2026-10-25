"""productos: reglas de negocio y transacciones."""

import contextlib

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.productos import imagenes, repository
from app.modules.productos.models import Seccion
from app.modules.productos.schemas import (
    ProductoCrear,
    ProductoModificar,
    ProductoSalida,
    ProductoSeleccionable,
    SeccionCrear,
    SeccionListado,
    SeccionResumen,
    SeccionSalida,
)
from app.shared.excepciones import DatosInvalidosError, NoEncontradoError, ReglaDeNegocioError
from app.shared.models import Categoria, Estado, Producto
from app.shared.models.producto import normalizar_nombre
from app.shared.paginacion import Pagina, ParametrosPaginacion


def _validar_nombre_libre(db: Session, nombre: str) -> None:
    if repository.existe_nombre_normalizado(db, nombre.casefold()):
        raise ReglaDeNegocioError("La sección ya existe")


def _validar_orden_libre(db: Session, orden: int) -> None:
    if repository.buscar_habilitada_por_orden(db, orden) is not None:
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


def _guardar(db: Session, datos: SeccionCrear, productos: list[Producto]) -> Seccion:
    seccion = Seccion(nombre=datos.nombre, orden=datos.orden, estado=Estado.HABILITADO)
    seccion.productos = productos
    try:
        repository.agregar(db, seccion)
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise ReglaDeNegocioError("La sección ya existe o la posición está ocupada") from error
    return seccion


def crear_seccion(db: Session, datos: SeccionCrear) -> SeccionSalida:
    _validar_nombre_libre(db, datos.nombre)
    _validar_orden_libre(db, datos.orden)
    productos = _cargar_productos(db, datos.producto_ids)
    _validar_habilitados(productos)
    _validar_traslado(db, productos, datos.confirmar_traslado)
    return SeccionSalida.model_validate(_guardar(db, datos, productos))


def _validar_seccion_habilitada(db: Session, seccion_id: int) -> Seccion:
    seccion = repository.obtener_seccion(db, seccion_id)
    if seccion is None:
        raise NoEncontradoError(f"La sección {seccion_id} no existe")
    if seccion.estado != Estado.HABILITADO:
        raise ReglaDeNegocioError(f"La sección {seccion.nombre} está deshabilitada")
    return seccion


def _validar_producto_libre(
    db: Session, datos: ProductoCrear, excluir_id: int | None = None
) -> None:
    if repository.existe_producto(db, datos.CATEGORIA, normalizar_nombre(datos.nombre), excluir_id):
        raise ReglaDeNegocioError(datos.MENSAJE_NOMBRE_REPETIDO)


def _armar_producto(datos: ProductoCrear, archivo: str | None) -> Producto:
    return Producto(
        nombre=datos.nombre,
        categoria=datos.CATEGORIA,
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
        imagen_url=f"/media/{producto.imagen}" if producto.imagen else None,
    )


def crear_producto(db: Session, datos: ProductoCrear, imagen: bytes | None) -> ProductoSalida:
    """Alta compartida de platos, postres y bebidas. Orden de validacion: B6."""
    procesada = imagenes.procesar(imagen) if imagen is not None else None
    seccion = _validar_seccion_habilitada(db, datos.seccion_id)
    _validar_producto_libre(db, datos)
    archivo = imagenes.guardar(procesada) if procesada else None
    producto = _armar_producto(datos, archivo)
    _guardar_producto(db, producto, datos.MENSAJE_NOMBRE_REPETIDO, archivo)
    return _a_salida(producto, seccion)


def _obtener_de_categoria(db: Session, categoria: Categoria, producto_id: int) -> Producto:
    producto = repository.obtener_producto(db, categoria, producto_id)
    if producto is None:
        raise NoEncontradoError(f"El producto {producto_id} no existe")
    return producto


def obtener_producto(db: Session, categoria: Categoria, producto_id: int) -> ProductoSalida:
    producto = _obtener_de_categoria(db, categoria, producto_id)
    return _a_salida(producto, repository.obtener_seccion(db, producto.seccion_id))


def _validar_imagen_pedida(datos: ProductoModificar, imagen: bytes | None) -> None:
    if datos.quitar_imagen and imagen is not None:
        raise DatosInvalidosError("No se puede quitar y reemplazar la imagen a la vez")


def _validar_seccion_si_cambia(
    db: Session, producto: Producto, datos: ProductoModificar
) -> Seccion:
    """Solo se valida si la seccion cambia: puede seguir deshabilitada (S19)."""
    if datos.seccion_id == producto.seccion_id:
        return repository.obtener_seccion(db, producto.seccion_id)
    return _validar_seccion_habilitada(db, datos.seccion_id)


def _aplicar_cambios(
    producto: Producto, datos: ProductoModificar, archivo_nuevo: str | None
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


def modificar_producto(
    db: Session, producto_id: int, datos: ProductoModificar, imagen: bytes | None
) -> ProductoSalida:
    """Modificacion compartida (reemplazo completo). Orden de validacion: E6."""
    _validar_imagen_pedida(datos, imagen)
    procesada = imagenes.procesar(imagen) if imagen is not None else None
    producto = _obtener_de_categoria(db, datos.CATEGORIA, producto_id)
    seccion = _validar_seccion_si_cambia(db, producto, datos)
    _validar_producto_libre(db, datos, producto.id)
    archivo = imagenes.guardar(procesada) if procesada else None
    anterior = producto.imagen
    _aplicar_cambios(producto, datos, archivo)
    _guardar_producto(db, producto, datos.MENSAJE_NOMBRE_REPETIDO, archivo)
    if producto.imagen != anterior:
        _borrar_anterior(anterior)
    return _a_salida(producto, seccion)


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
        )
        for seccion, cantidad in filas
    ]
    return Pagina[SeccionListado](
        items=items, total=total, limit=parametros.limit, offset=parametros.offset
    )


def listar_productos(
    db: Session, parametros: ParametrosPaginacion
) -> Pagina[ProductoSeleccionable]:
    filas, total = repository.listar_productos_habilitados(db, parametros)
    items = [
        ProductoSeleccionable(
            id=producto.id,
            nombre=producto.nombre,
            categoria=producto.categoria,
            seccion=SeccionResumen(id=seccion.id, nombre=seccion.nombre),
        )
        for producto, seccion in filas
    ]
    return Pagina[ProductoSeleccionable](
        items=items, total=total, limit=parametros.limit, offset=parametros.offset
    )
