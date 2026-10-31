"""salon: endpoints HTTP. Solo delega al service (D-02)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.salon import service
from app.modules.salon.schemas import (
    FiltroMozos,
    FiltroSectores,
    MesaCrear,
    MesaModificar,
    MesaSalida,
    MozoCrear,
    MozoModificar,
    MozoSalida,
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


@router.put("/mesas/{mesa_id}")
def modificar_mesa(mesa_id: int, datos: MesaModificar, db: Sesion) -> MesaSalida:
    return service.modificar_mesa(db, mesa_id, datos)


@router.delete("/mesas/{mesa_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_mesa(mesa_id: int, db: Sesion) -> None:
    service.eliminar_mesa(db, mesa_id)


@router.get("/sectores")
def listar_sectores(db: Sesion, filtro: Annotated[FiltroSectores, Query()]) -> Pagina[SectorSalida]:
    return service.listar_sectores(db, filtro, filtro.estado)


@router.post("/mozos", status_code=status.HTTP_201_CREATED)
def crear_mozo(datos: MozoCrear, db: Sesion) -> MozoSalida:
    return service.crear_mozo(db, datos)


@router.get("/mozos")
def listar_mozos(db: Sesion, filtro: Annotated[FiltroMozos, Query()]) -> Pagina[MozoSalida]:
    return service.listar_mozos(db, filtro, filtro.estado)


@router.put("/mozos/{mozo_id}")
def modificar_mozo(mozo_id: int, datos: MozoModificar, db: Sesion) -> MozoSalida:
    return service.modificar_mozo(db, mozo_id, datos)


@router.post("/mozos/{mozo_id}/baja")
def dar_de_baja_mozo(mozo_id: int, db: Sesion) -> MozoSalida:
    return service.dar_de_baja_mozo(db, mozo_id)
