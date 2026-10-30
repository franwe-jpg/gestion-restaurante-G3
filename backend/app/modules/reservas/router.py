"""reservas: endpoints HTTP. Solo delega al service (D-02)."""

from datetime import date, time
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.reservas import service
from app.modules.reservas.schemas import (
    FiltroReservas,
    MesaResumen,
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


@router.put("/reservas/{reserva_id}")
def modificar_reserva(reserva_id: int, datos: ReservaModificar, db: Sesion) -> ReservaSalida:
    return service.modificar_reserva(db, reserva_id, datos)


@router.get("/reservas")
def listar_reservas(
    db: Sesion, filtro: Annotated[FiltroReservas, Query()]
) -> Pagina[ReservaSalida]:
    return service.listar_reservas(db, filtro, filtro.fecha)


@router.get("/reservas/mesas-disponibles")
def listar_mesas_disponibles(db: Sesion, fecha: date, hora: time) -> list[MesaResumen]:
    return service.listar_mesas_disponibles(db, fecha, hora)
