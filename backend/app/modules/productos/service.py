"""productos: reglas de negocio y transacciones."""

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.productos import repository
from app.modules.productos.models import Seccion
from app.modules.productos.schemas import (
    ProductoSeleccionable,
    SeccionCrear,
    SeccionListado,
    SeccionResumen,
    SeccionSalida,
)
from app.shared.excepciones import NoEncontradoError, ReglaDeNegocioError
from app.shared.models import Estado, Producto
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


def listar_secciones(db: Session, parametros: ParametrosPaginacion) -> Pagina[SeccionListado]:
    filas, total = repository.listar_secciones(db, parametros)
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
