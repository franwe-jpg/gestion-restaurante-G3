"""menus: acceso a datos."""

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.menus.models import MenuEjecutivo
from app.shared.models import Estado, Producto
from app.shared.paginacion import ParametrosPaginacion, aplicar, contar


def existe_nombre_normalizado(db: Session, nombre_normalizado: str) -> bool:
    consulta = select(MenuEjecutivo.id).where(
        MenuEjecutivo.nombre_normalizado == nombre_normalizado
    )
    return db.scalar(consulta.limit(1)) is not None


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
