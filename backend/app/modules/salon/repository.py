"""salon: acceso a datos. Nunca confirma la transaccion: lo hace el service (D-10)."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.salon.models import Sector


def existe_nombre_normalizado(db: Session, nombre_normalizado: str) -> bool:
    consulta = select(Sector.id).where(Sector.nombre_normalizado == nombre_normalizado)
    return db.scalar(consulta.limit(1)) is not None


def agregar(db: Session, entidad: Sector) -> None:
    db.add(entidad)
    db.flush()
