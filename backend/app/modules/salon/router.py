"""salon: endpoints HTTP. Solo delega al service (D-02)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.salon import service
from app.modules.salon.schemas import (
    FiltroSectores,
    MesaCrear,
    MesaSalida,
    SectorCrear,
    SectorSalida,
)
from app.shared.paginacion import Pagina, ParametrosPaginacion

router = APIRouter()

Sesion = Annotated[Session, Depends(get_db)]


@router.post("/sectores", status_code=status.HTTP_201_CREATED)
def crear_sector(datos: SectorCrear, db: Sesion) -> SectorSalida:
    return service.crear_sector(db, datos)


@router.post("/mesas", status_code=status.HTTP_201_CREATED)
def crear_mesa(datos: MesaCrear, db: Sesion) -> MesaSalida:
    return service.crear_mesa(db, datos)


@router.get("/sectores")
def listar_sectores(db: Sesion, filtro: Annotated[FiltroSectores, Query()]) -> Pagina[SectorSalida]:
    return service.listar_sectores(db, filtro, filtro.estado)


@router.get("/mesas")
def listar_mesas(
    db: Sesion, filtro: Annotated[ParametrosPaginacion, Query()]
) -> Pagina[MesaSalida]:
    return service.listar_mesas(db, filtro)
