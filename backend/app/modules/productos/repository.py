"""productos: acceso a datos. Nunca confirma la transaccion: lo hace el service (D-10)."""

from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.productos.models import Seccion
from app.shared.models import Estado, Producto
from app.shared.paginacion import ParametrosPaginacion, aplicar, contar


def existe_nombre_normalizado(db: Session, nombre_normalizado: str) -> bool:
    consulta = select(Seccion.id).where(Seccion.nombre_normalizado == nombre_normalizado)
    return db.scalar(consulta.limit(1)) is not None


def buscar_habilitada_por_orden(db: Session, orden: int) -> Seccion | None:
    consulta = select(Seccion).where(Seccion.orden == orden, Seccion.estado == Estado.HABILITADO)
    return db.scalar(consulta)


def obtener_productos(db: Session, ids: Sequence[int]) -> list[Producto]:
    return list(db.scalars(select(Producto).where(Producto.id.in_(ids))))


def obtener_nombre_de_seccion(db: Session, seccion_id: int) -> str:
    return db.scalar(select(Seccion.nombre).where(Seccion.id == seccion_id)) or ""


def agregar(db: Session, seccion: Seccion) -> None:
    db.add(seccion)
    db.flush()


def listar_secciones(
    db: Session, parametros: ParametrosPaginacion
) -> tuple[list[tuple[Seccion, int]], int]:
    """Devuelve la pagina de secciones con su cantidad de productos y el total."""
    consulta = (
        select(Seccion, func.count(Producto.id))
        .outerjoin(Producto, Producto.seccion_id == Seccion.id)
        .group_by(Seccion.id)
        .order_by(Seccion.orden, Seccion.id)
    )
    filas = db.execute(aplicar(consulta, parametros)).all()
    return [(seccion, cantidad) for seccion, cantidad in filas], contar(db, select(Seccion))


def listar_productos_habilitados(
    db: Session, parametros: ParametrosPaginacion
) -> tuple[list[tuple[Producto, Seccion]], int]:
    """Devuelve la pagina de productos habilitados con su seccion actual y el total."""
    consulta = (
        select(Producto, Seccion)
        .join(Seccion, Producto.seccion_id == Seccion.id)
        .where(Producto.estado == Estado.HABILITADO)
        .order_by(Producto.nombre, Producto.id)
    )
    filas = db.execute(aplicar(consulta, parametros)).all()
    return [(producto, seccion) for producto, seccion in filas], contar(db, consulta)
