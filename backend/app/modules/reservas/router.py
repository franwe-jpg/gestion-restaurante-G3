"""reservas: endpoints HTTP. Solo delega al service (D-02)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.reservas import service
from app.modules.reservas.schemas import (
    FiltroReservas,
    ReservaCrear,
    ReservaModificar,
    ReservaSalida,
)
from app.shared.paginacion import Pagina

router = APIRouter()

Sesion = Annotated[Session, Depends(get_db)]


@router.post("/reservas", status_code=status.HTTP_201_CREATED)
def crear_reserva(datos: ReservaCrear, db: Sesion) -> ReservaSalida:
    return service.crear_reserva(db, datos)


@router.get("/reservas")
def listar_reservas(
    db: Sesion, filtro: Annotated[FiltroReservas, Query()]
) -> Pagina[ReservaSalida]:
    return service.listar_reservas(db, filtro)


@router.get("/reservas/{reserva_id}")
def consultar_reserva(reserva_id: int, db: Sesion) -> ReservaSalida:
    return service.obtener_reserva(db, reserva_id)


@router.put("/reservas/{reserva_id}")
def modificar_reserva(reserva_id: int, datos: ReservaModificar, db: Sesion) -> ReservaSalida:
    return service.modificar_reserva(db, reserva_id, datos)
