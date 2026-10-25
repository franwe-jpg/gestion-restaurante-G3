"""productos: endpoints HTTP. Solo delega al service (D-02)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.productos import service
from app.modules.productos.schemas import (
    ProductoSeleccionable,
    SeccionCrear,
    SeccionListado,
    SeccionSalida,
)
from app.shared.paginacion import Pagina, ParametrosPaginacion

router = APIRouter()

Sesion = Annotated[Session, Depends(get_db)]
Paginacion = Annotated[ParametrosPaginacion, Query()]


@router.post("/secciones", status_code=status.HTTP_201_CREATED)
def crear_seccion(datos: SeccionCrear, db: Sesion) -> SeccionSalida:
    return service.crear_seccion(db, datos)


@router.get("/secciones")
def listar_secciones(db: Sesion, paginacion: Paginacion) -> Pagina[SeccionListado]:
    return service.listar_secciones(db, paginacion)


@router.get("/productos")
def listar_productos(db: Sesion, paginacion: Paginacion) -> Pagina[ProductoSeleccionable]:
    return service.listar_productos(db, paginacion)
