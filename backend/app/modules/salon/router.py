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
    SectorModificar,
    SectorSalida,
)
from app.shared.paginacion import Pagina, ParametrosPaginacion

router = APIRouter()

Sesion = Annotated[Session, Depends(get_db)]


@router.post("/sectores", status_code=status.HTTP_201_CREATED)
def crear_sector(datos: SectorCrear, db: Sesion) -> SectorSalida:
    return service.crear_sector(db, datos)


@router.put("/sectores/{sector_id}")
def modificar_sector(sector_id: int, datos: SectorModificar, db: Sesion) -> SectorSalida:
    return service.modificar_sector(db, sector_id, datos)


@router.post("/sectores/{sector_id}/baja")
def dar_de_baja_sector(sector_id: int, db: Sesion) -> SectorSalida:
    return service.dar_de_baja_sector(db, sector_id)


@router.post("/mesas", status_code=status.HTTP_201_CREATED)
def crear_mesa(datos: MesaCrear, db: Sesion) -> MesaSalida:
    return service.crear_mesa(db, datos)


@router.get("/mesas")
def listar_mesas(
    db: Sesion, filtro: Annotated[ParametrosPaginacion, Query()]
) -> Pagina[MesaSalida]:
    return service.listar_mesas(db, filtro)


@router.delete("/mesas/{mesa_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_mesa(mesa_id: int, db: Sesion) -> None:
    service.eliminar_mesa(db, mesa_id)


@router.get("/sectores")
def listar_sectores(db: Sesion, filtro: Annotated[FiltroSectores, Query()]) -> Pagina[SectorSalida]:
    return service.listar_sectores(db, filtro, filtro.estado)
