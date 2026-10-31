"""pagos: endpoints HTTP. Solo delega al service (D-02)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.pagos import service
from app.modules.pagos.schemas import (
    FiltroMediosPago,
    MedioPagoCrear,
    MedioPagoModificar,
    MedioPagoSalida,
)
from app.shared.paginacion import Pagina

router = APIRouter()

Sesion = Annotated[Session, Depends(get_db)]


@router.post("/medios-de-pago", status_code=status.HTTP_201_CREATED)
def crear_medio_pago(datos: MedioPagoCrear, db: Sesion) -> MedioPagoSalida:
    return service.crear_medio_pago(db, datos)


@router.put("/medios-de-pago/{medio_pago_id}")
def modificar_medio_pago(
    medio_pago_id: int, datos: MedioPagoModificar, db: Sesion
) -> MedioPagoSalida:
    return service.modificar_medio_pago(db, medio_pago_id, datos)


@router.delete("/medios-de-pago/{medio_pago_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_medio_pago(medio_pago_id: int, db: Sesion) -> None:
    service.eliminar_medio_pago(db, medio_pago_id)


@router.get("/medios-de-pago")
def listar_medios_pago(
    db: Sesion, filtro: Annotated[FiltroMediosPago, Query()]
) -> Pagina[MedioPagoSalida]:
    return service.listar_medios_pago(db, filtro)
