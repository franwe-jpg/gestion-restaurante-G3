"""Rutas de lectura y edición de clientes; no expone alta aislada."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.atencion import service
from app.modules.atencion.schemas import ClienteModificar, ClienteSalida, FiltroClientes
from app.shared.paginacion import Pagina

router = APIRouter()
Sesion = Annotated[Session, Depends(get_db)]


@router.put("/clientes/{cliente_id}")
def modificar_cliente(cliente_id: int, datos: ClienteModificar, db: Sesion) -> ClienteSalida:
    return service.modificar_cliente(db, cliente_id, datos)


@router.get("/clientes")
def listar_clientes(
    db: Sesion, filtro: Annotated[FiltroClientes, Query()]
) -> Pagina[ClienteSalida]:
    return service.listar_clientes(db, filtro, filtro.q)
