"""menus: acceso a datos.

El menu del dia es un `Producto` y persiste a traves de `productos.service` (D-05).
Aca viven las consultas propias de los menus ejecutivos y de las promociones.
"""

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.menus.models import MenuEjecutivo, Promocion
from app.shared.models import Estado, Producto
from app.shared.paginacion import ParametrosPaginacion, aplicar, contar


def existe_nombre_normalizado(
    db: Session, nombre_normalizado: str, excluir_id: int | None = None
) -> bool:
    consulta = select(MenuEjecutivo.id).where(
        MenuEjecutivo.nombre_normalizado == nombre_normalizado
    )
    if excluir_id is not None:
        consulta = consulta.where(MenuEjecutivo.id != excluir_id)
    return db.scalar(consulta.limit(1)) is not None


def obtener(db: Session, menu_id: int) -> MenuEjecutivo | None:
    consulta = (
        select(MenuEjecutivo)
        .where(MenuEjecutivo.id == menu_id)
        .options(selectinload(MenuEjecutivo.productos))
    )
    return db.scalar(consulta)


def obtener_productos(db: Session, producto_ids: list[int]) -> list[Producto]:
    consulta = select(Producto).where(Producto.id.in_(producto_ids)).order_by(Producto.id)
    return list(db.scalars(consulta).all())


def agregar(db: Session, menu: MenuEjecutivo) -> None:
    db.add(menu)
    db.flush()


def listar(
    db: Session, parametros: ParametrosPaginacion, estado: Estado | None
) -> tuple[list[MenuEjecutivo], int]:
    consulta = select(MenuEjecutivo)
    if estado is not None:
        consulta = consulta.where(MenuEjecutivo.estado == estado)
    ordenada = consulta.options(selectinload(MenuEjecutivo.productos)).order_by(
        MenuEjecutivo.nombre_normalizado, MenuEjecutivo.id
    )
    filas = db.scalars(aplicar(ordenada, parametros)).all()
    return list(filas), contar(db, consulta)


def existe_nombre_promocion(
    db: Session, nombre_normalizado: str, excluir_id: int | None = None
) -> bool:
    consulta = select(Promocion.id).where(Promocion.nombre_normalizado == nombre_normalizado)
    if excluir_id is not None:
        consulta = consulta.where(Promocion.id != excluir_id)
    return db.scalar(consulta.limit(1)) is not None


def agregar_promocion(db: Session, promocion: Promocion) -> None:
    db.add(promocion)
    db.flush()


def listar_promociones(
    db: Session, parametros: ParametrosPaginacion, estado: Estado | None
) -> tuple[list[Promocion], int]:
    consulta = select(Promocion)
    if estado is not None:
        consulta = consulta.where(Promocion.estado == estado)
    ordenada = consulta.options(selectinload(Promocion.productos)).order_by(
        Promocion.nombre_normalizado, Promocion.id
    )
    filas = db.scalars(aplicar(ordenada, parametros)).all()
    return list(filas), contar(db, consulta)


def obtener_promocion(db: Session, promocion_id: int) -> Promocion | None:
    consulta = (
        select(Promocion)
        .where(Promocion.id == promocion_id)
        .options(selectinload(Promocion.productos))
    )
    return db.scalar(consulta)


def promociones_del_producto(db: Session, producto_id: int, fecha: date) -> list[Promocion]:
    """Promociones habilitadas del producto que cubren la fecha, ordenadas por id (S4-02)."""
    consulta = (
        select(Promocion)
        .where(
            Promocion.estado == Estado.HABILITADO,
            Promocion.fecha_desde <= fecha,
            Promocion.fecha_hasta >= fecha,
            Promocion.productos.any(Producto.id == producto_id),
        )
        .order_by(Promocion.id)
    )
    return list(db.scalars(consulta).all())
