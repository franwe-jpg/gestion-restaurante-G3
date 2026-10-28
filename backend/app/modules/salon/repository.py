"""salon: acceso a datos. Nunca confirma la transaccion: lo hace el service (D-10)."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.salon.models import Mesa, Sector
from app.shared.models import Estado
from app.shared.paginacion import ParametrosPaginacion, aplicar, contar


def existe_nombre_normalizado(
    db: Session, nombre_normalizado: str, excluir_id: int | None = None
) -> bool:
    consulta = select(Sector.id).where(Sector.nombre_normalizado == nombre_normalizado)
    if excluir_id is not None:
        consulta = consulta.where(Sector.id != excluir_id)
    return db.scalar(consulta.limit(1)) is not None


def obtener_sector(db: Session, sector_id: int) -> Sector | None:
    return db.get(Sector, sector_id)


def existe_numero_en_sector(db: Session, sector_id: int, numero: int) -> bool:
    consulta = select(Mesa.id).where(Mesa.sector_id == sector_id, Mesa.numero == numero)
    return db.scalar(consulta.limit(1)) is not None


def agregar(db: Session, entidad: Sector | Mesa) -> None:
    db.add(entidad)
    db.flush()


def listar_sectores(
    db: Session, parametros: ParametrosPaginacion, estado: Estado | None
) -> tuple[list[Sector], int]:
    """Devuelve la pagina de sectores ordenada por nombre y el total.

    Con `estado`, el listado y el total cuentan solo los sectores en ese estado.
    """
    consulta = select(Sector)
    if estado is not None:
        consulta = consulta.where(Sector.estado == estado)
    consulta_ordenada = consulta.order_by(Sector.nombre, Sector.id)
    filas = db.scalars(aplicar(consulta_ordenada, parametros)).all()
    return list(filas), contar(db, consulta)


def contar_mesas_del_sector(db: Session, sector_id: int) -> int:
    """Cuenta las mesas del sector sin cargarlas (HU-M3-03)."""
    consulta = select(func.count()).select_from(Mesa).where(Mesa.sector_id == sector_id)
    return db.scalar(consulta) or 0


def listar_mesas(
    db: Session, parametros: ParametrosPaginacion
) -> tuple[list[tuple[Mesa, Sector]], int]:
    """Pagina de mesas con su sector, ordenada por sector y numero (HU-M3-08)."""
    consulta = select(Mesa, Sector).join(Sector, Mesa.sector_id == Sector.id)
    ordenada = consulta.order_by(Sector.nombre, Mesa.numero, Mesa.id)
    filas = db.execute(aplicar(ordenada, parametros)).all()
    return [(mesa, sector) for mesa, sector in filas], contar(db, select(Mesa.id))
