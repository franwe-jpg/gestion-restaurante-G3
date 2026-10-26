"""salon: reglas de negocio y transacciones."""

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.salon import repository
from app.modules.salon.models import Sector
from app.modules.salon.schemas import SectorCrear, SectorSalida
from app.shared.excepciones import ReglaDeNegocioError
from app.shared.models import Estado


def _validar_nombre_libre(db: Session, nombre: str) -> None:
    if repository.existe_nombre_normalizado(db, nombre.strip().casefold()):
        raise ReglaDeNegocioError("El sector ya existe")


def _guardar(db: Session, datos: SectorCrear) -> Sector:
    sector = Sector(
        nombre=datos.nombre,
        descripcion=datos.descripcion,
        estado=Estado.HABILITADO,
    )
    try:
        repository.agregar(db, sector)
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise ReglaDeNegocioError("El sector ya existe") from error
    return sector


def crear_sector(db: Session, datos: SectorCrear) -> SectorSalida:
    _validar_nombre_libre(db, datos.nombre)
    return SectorSalida.model_validate(_guardar(db, datos))
