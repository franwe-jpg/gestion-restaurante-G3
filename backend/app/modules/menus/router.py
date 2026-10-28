"""menus: endpoints HTTP. Solo delega al service (D-02)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.menus import service
from app.modules.menus.schemas import (
    FiltroMenusEjecutivos,
    MenuEjecutivoCrear,
    MenuEjecutivoListado,
    MenuEjecutivoSalida,
)
from app.shared.paginacion import Pagina

router = APIRouter()

Sesion = Annotated[Session, Depends(get_db)]


@router.post("/menus-ejecutivos", status_code=status.HTTP_201_CREATED)
def crear_menu_ejecutivo(datos: MenuEjecutivoCrear, db: Sesion) -> MenuEjecutivoSalida:
    return service.crear_menu_ejecutivo(db, datos)


@router.get("/menus-ejecutivos")
def listar_menus_ejecutivos(
    db: Sesion, filtro: Annotated[FiltroMenusEjecutivos, Query()]
) -> Pagina[MenuEjecutivoListado]:
    return service.listar_menus_ejecutivos(db, filtro)
