"""productos: acceso a datos. Nunca confirma la transaccion: lo hace el service (D-10)."""

from collections.abc import Sequence

from sqlalchemy import ColumnElement, and_, exists, func, or_, select
from sqlalchemy.orm import Session

from app.modules.productos.models import Seccion
from app.shared.models import Categoria, Estado, Producto
from app.shared.paginacion import ParametrosPaginacion, aplicar, contar


def existe_nombre_normalizado(
    db: Session, nombre_normalizado: str, excluir_id: int | None = None
) -> bool:
    consulta = select(Seccion.id).where(Seccion.nombre_normalizado == nombre_normalizado)
    if excluir_id is not None:
        consulta = consulta.where(Seccion.id != excluir_id)
    return db.scalar(consulta.limit(1)) is not None


def buscar_habilitada_por_orden(
    db: Session, orden: int, excluir_id: int | None = None
) -> Seccion | None:
    consulta = select(Seccion).where(Seccion.orden == orden, Seccion.estado == Estado.HABILITADO)
    if excluir_id is not None:
        consulta = consulta.where(Seccion.id != excluir_id)
    return db.scalar(consulta)


def obtener_productos(db: Session, ids: Sequence[int]) -> list[Producto]:
    return list(db.scalars(select(Producto).where(Producto.id.in_(ids))))


def obtener_nombre_de_seccion(db: Session, seccion_id: int) -> str:
    return db.scalar(select(Seccion.nombre).where(Seccion.id == seccion_id)) or ""


def obtener_seccion(db: Session, seccion_id: int) -> Seccion | None:
    return db.get(Seccion, seccion_id)


def obtener_secciones_por_ids(db: Session, ids: Sequence[int]) -> dict[int, Seccion]:
    """Secciones por id en un solo viaje, para armar varios productos sin N+1 (M2)."""
    consulta = select(Seccion).where(Seccion.id.in_(ids))
    return {seccion.id: seccion for seccion in db.scalars(consulta)}


def existe_producto(
    db: Session, categoria: Categoria, nombre_normalizado: str, excluir_id: int | None = None
) -> bool:
    consulta = select(Producto.id).where(
        Producto.categoria == categoria, Producto.nombre_normalizado == nombre_normalizado
    )
    if excluir_id is not None:
        consulta = consulta.where(Producto.id != excluir_id)
    return db.scalar(consulta.limit(1)) is not None


def obtener_producto(db: Session, categoria: Categoria, producto_id: int) -> Producto | None:
    consulta = select(Producto).where(Producto.id == producto_id, Producto.categoria == categoria)
    return db.scalar(consulta)


def agregar(db: Session, entidad: Seccion | Producto) -> None:
    db.add(entidad)
    db.flush()


def listar_secciones(
    db: Session, parametros: ParametrosPaginacion, estado: Estado | None = None
) -> tuple[list[tuple[Seccion, int, int]], int]:
    """Devuelve la pagina de secciones con su cantidad de productos, los habilitados y el total.

    Con `estado`, el listado y el total cuentan solo las secciones en ese estado.
    """
    consulta = (
        select(
            Seccion,
            func.count(Producto.id),
            func.count(Producto.id).filter(Producto.estado == Estado.HABILITADO),
        )
        .outerjoin(Producto, Producto.seccion_id == Seccion.id)
        .group_by(Seccion.id)
        .order_by(Seccion.orden, Seccion.id)
    )
    total = select(Seccion)
    if estado is not None:
        consulta = consulta.where(Seccion.estado == estado)
        total = total.where(Seccion.estado == estado)
    filas = db.execute(aplicar(consulta, parametros)).all()
    return [(s, cantidad, habilitados) for s, cantidad, habilitados in filas], contar(db, total)


def listar_productos(
    db: Session,
    parametros: ParametrosPaginacion,
    estado: Estado | None,
    categoria: Categoria | None = None,
    categoria_excluida: Categoria | None = None,
) -> tuple[list[tuple[Producto, Seccion]], int]:
    """Devuelve la pagina de productos con su seccion actual y el total.

    Con `estado`, el listado y el total cuentan solo los productos en ese estado.
    Con `categoria`, solo los de esa categoria (M2 lista los menus del dia).
    Con `categoria_excluida`, omite esa categoria del listado general de productos.
    """
    consulta = (
        select(Producto, Seccion)
        .join(Seccion, Producto.seccion_id == Seccion.id)
        .order_by(Producto.nombre, Producto.id)
    )
    if estado is not None:
        consulta = consulta.where(Producto.estado == estado)
    if categoria is not None:
        consulta = consulta.where(Producto.categoria == categoria)
    if categoria_excluida is not None:
        consulta = consulta.where(Producto.categoria != categoria_excluida)
    filas = db.execute(aplicar(consulta, parametros)).all()
    return [(producto, seccion) for producto, seccion in filas], contar(db, consulta)


def _condicion_de_carta(estado: Estado | None) -> ColumnElement[bool] | None:
    """Predicado de las secciones visibles en la carta (I4); `None` significa sin condicion."""
    if estado is None:
        return None
    con_productos = exists().where(Producto.seccion_id == Seccion.id, Producto.estado == estado)
    if estado == Estado.HABILITADO:
        return and_(Seccion.estado == Estado.HABILITADO, con_productos)
    return or_(Seccion.estado == Estado.DESHABILITADO, con_productos)


def listar_secciones_de_carta(
    db: Session, parametros: ParametrosPaginacion, estado: Estado | None
) -> tuple[list[Seccion], int]:
    """Devuelve la pagina de secciones visibles en la carta y el total (I3, I5)."""
    consulta = select(Seccion).order_by(Seccion.orden, Seccion.nombre, Seccion.id)
    condicion = _condicion_de_carta(estado)
    if condicion is not None:
        consulta = consulta.where(condicion)
    secciones = list(db.scalars(aplicar(consulta, parametros)))
    return secciones, contar(db, consulta)


def listar_productos_de_secciones(
    db: Session, ids: Sequence[int], estado: Estado | None
) -> list[Producto]:
    """Devuelve los productos de las secciones dadas, filtrados por estado (I3, I5)."""
    consulta = (
        select(Producto).where(Producto.seccion_id.in_(ids)).order_by(Producto.nombre, Producto.id)
    )
    if estado is not None:
        consulta = consulta.where(Producto.estado == estado)
    return list(db.scalars(consulta))
