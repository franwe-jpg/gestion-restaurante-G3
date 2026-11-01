"""Rutas de Cliente y Comanda; delegan al servicio de M4."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.atencion import service
from app.modules.atencion.schemas import (
    ClienteModificar,
    ClienteSalida,
    FiltroClientes,
    PendientesComanda,
)
from app.shared.contratos.comanda import ComandaCrear, ComandaResumen, ComandaSalida, EstadoComanda
from app.shared.paginacion import LIMIT_MAXIMO, LIMIT_POR_DEFECTO, Pagina, ParametrosPaginacion

router = APIRouter(tags=["Atención al Público"])
Sesion = Annotated[Session, Depends(get_db)]


def obtener_mesas_port() -> service.MesasPort:
    raise HTTPException(503, "Alta pendiente de integración con el servicio de mesas")


def obtener_catalogo_port() -> service.CatalogoPort:
    raise HTTPException(503, "Alta pendiente de integración con el catálogo")


@router.post("/comandas", status_code=201)
def crear_comanda(
    datos: ComandaCrear,
    db: Sesion,
    mesas: Annotated[service.MesasPort, Depends(obtener_mesas_port)],
    catalogo: Annotated[service.CatalogoPort, Depends(obtener_catalogo_port)],
) -> ComandaSalida:
    return service.crear_comanda(db, datos, mesas, catalogo)


@router.get("/comandas")
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


@router.post("/comandas/{comanda_id}/cerrar")
def cerrar_comanda(comanda_id: Annotated[int, Path(gt=0)], db: Sesion) -> ComandaSalida:
    return service.cerrar_comanda(db, comanda_id)


@router.get("/comandas/{comanda_id}/pendientes")
def consultar_pendientes(comanda_id: Annotated[int, Path(gt=0)], db: Sesion) -> PendientesComanda:
    return service.consultar_pendientes(db, comanda_id)


@router.put("/clientes/{cliente_id}")
def modificar_cliente(cliente_id: int, datos: ClienteModificar, db: Sesion) -> ClienteSalida:
    return service.modificar_cliente(db, cliente_id, datos)


@router.get("/clientes")
def listar_clientes(
    db: Sesion, filtro: Annotated[FiltroClientes, Query()]
) -> Pagina[ClienteSalida]:
    return service.listar_clientes(db, filtro, filtro.q)
