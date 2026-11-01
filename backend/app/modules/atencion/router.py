"""M4: rutas de listado y cierre local; solo delegan al servicio."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.atencion import service
from app.modules.atencion.schemas import PendientesComanda
from app.shared.contratos.comanda import ComandaCrear, ComandaResumen, ComandaSalida, EstadoComanda
from app.shared.paginacion import LIMIT_MAXIMO, LIMIT_POR_DEFECTO, Pagina, ParametrosPaginacion

router = APIRouter(prefix="/comandas", tags=["Atención al Público"])
Sesion = Annotated[Session, Depends(get_db)]


def obtener_mesas_port() -> service.MesasPort:
    raise HTTPException(503, "Alta pendiente de integración con el servicio de mesas")


def obtener_catalogo_port() -> service.CatalogoPort:
    raise HTTPException(503, "Alta pendiente de integración con el catálogo")


@router.post("", status_code=201)
def crear_comanda(
    datos: ComandaCrear,
    db: Sesion,
    mesas: Annotated[service.MesasPort, Depends(obtener_mesas_port)],
    catalogo: Annotated[service.CatalogoPort, Depends(obtener_catalogo_port)],
) -> ComandaSalida:
    return service.crear_comanda(db, datos, mesas, catalogo)


@router.get("")
def listar_comandas(
    db: Sesion,
    mesa_id: Annotated[int | None, Query(gt=0)] = None,
    estado: EstadoComanda | None = None,
    limit: Annotated[int, Query(ge=1, le=LIMIT_MAXIMO)] = LIMIT_POR_DEFECTO,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Pagina[ComandaResumen]:
    return service.listar_comandas(
        db, ParametrosPaginacion(limit=limit, offset=offset), mesa_id, estado
    )


@router.post("/{comanda_id}/cerrar")
def cerrar_comanda(comanda_id: Annotated[int, Path(gt=0)], db: Sesion) -> ComandaSalida:
    return service.cerrar_comanda(db, comanda_id)


@router.get("/{comanda_id}/pendientes")
def consultar_pendientes(comanda_id: Annotated[int, Path(gt=0)], db: Sesion) -> PendientesComanda:
    return service.consultar_pendientes(db, comanda_id)
