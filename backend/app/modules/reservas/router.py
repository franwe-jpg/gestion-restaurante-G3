"""reservas: endpoints HTTP. Solo delega al service (D-02)."""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.reservas import service
from app.modules.reservas.schemas import ReservaCrear, ReservaSalida

router = APIRouter()

Sesion = Annotated[Session, Depends(get_db)]


@router.post("/reservas", status_code=status.HTTP_201_CREATED)
def crear_reserva(datos: ReservaCrear, db: Sesion) -> ReservaSalida:
    return service.crear_reserva(db, datos)
