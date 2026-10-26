"""salon: endpoints HTTP. Solo delega al service (D-02)."""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.salon import service
from app.modules.salon.schemas import SectorCrear, SectorSalida

router = APIRouter()

Sesion = Annotated[Session, Depends(get_db)]


@router.post("/sectores", status_code=status.HTTP_201_CREATED)
def crear_sector(datos: SectorCrear, db: Sesion) -> SectorSalida:
    return service.crear_sector(db, datos)
