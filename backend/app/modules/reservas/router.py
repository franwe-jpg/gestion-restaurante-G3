"""reservas: endpoints HTTP. Solo delega al service (D-02)."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.reservas import service
from app.modules.reservas.schemas import (
    ComandaDesdeReservaCrear,
    ConsultaMesasDisponibles,
    FiltroReservas,
    MesaDisponible,
    ReservaCrear,
    ReservaModificar,
    ReservaSalida,
    ResumenReservas,
)
from app.shared.contratos.comanda import ComandaSalida
from app.shared.paginacion import Pagina
from app.shared.permisos import Permiso
from app.shared.seguridad import requiere

router = APIRouter()

Sesion = Annotated[Session, Depends(get_db)]


@router.post(
    "/reservas",
    status_code=status.HTTP_201_CREATED,
    dependencies=[requiere(Permiso.RESERVAS_OPERAR)],
)
def crear_reserva(datos: ReservaCrear, db: Sesion) -> ReservaSalida:
    return service.crear_reserva(db, datos)


@router.get("/reservas", dependencies=[requiere(Permiso.RESERVAS_VER)])
def listar_reservas(
    db: Sesion, filtro: Annotated[FiltroReservas, Query()]
) -> Pagina[ReservaSalida]:
    return service.listar_reservas(db, filtro)


# Va antes que "/reservas/{reserva_id}": esa ruta acepta cualquier texto y la capturaria.
@router.get("/reservas/mesas-disponibles", dependencies=[requiere(Permiso.RESERVAS_VER)])
def listar_mesas_disponibles(
    db: Sesion, consulta: Annotated[ConsultaMesasDisponibles, Query()]
) -> list[MesaDisponible]:
    return service.listar_mesas_disponibles(db, consulta.fecha, consulta.hora)


@router.get("/reservas/{reserva_id}", dependencies=[requiere(Permiso.RESERVAS_VER)])
def consultar_reserva(reserva_id: int, db: Sesion) -> ReservaSalida:
    return service.obtener_reserva(db, reserva_id)


@router.put("/reservas/{reserva_id}", dependencies=[requiere(Permiso.RESERVAS_OPERAR)])
def modificar_reserva(reserva_id: int, datos: ReservaModificar, db: Sesion) -> ReservaSalida:
    return service.modificar_reserva(db, reserva_id, datos)


@router.post(
    "/reservas/{reserva_id}/cancelar-anticipada", dependencies=[requiere(Permiso.RESERVAS_OPERAR)]
)
def cancelar_anticipada(reserva_id: int, db: Sesion) -> ReservaSalida:
    return service.cancelar_anticipada(db, reserva_id)


@router.post(
    "/reservas/{reserva_id}/cancelar-por-ausencia", dependencies=[requiere(Permiso.RESERVAS_OPERAR)]
)
def cancelar_por_ausencia(reserva_id: int, db: Sesion) -> ReservaSalida:
    return service.cancelar_por_ausencia(db, reserva_id)


@router.post(
    "/reservas/{reserva_id}/comanda",
    status_code=status.HTTP_201_CREATED,
    dependencies=[requiere(Permiso.RESERVAS_OPERAR)],
)
def crear_comanda(reserva_id: int, datos: ComandaDesdeReservaCrear, db: Sesion) -> ComandaSalida:
    return service.crear_comanda(db, reserva_id, datos)


@router.get("/reportes/reservas-ausentismo", dependencies=[requiere(Permiso.REPORTES_VER)])
def reporte_reservas_ausentismo(
    db: Sesion, fecha_desde: date | None = None, fecha_hasta: date | None = None
) -> ResumenReservas:
    return service.generar_reporte_reservas_ausentismo(db, fecha_desde, fecha_hasta)


@router.get("/reportes/reservas-ausentismo/pdf", dependencies=[requiere(Permiso.REPORTES_VER)])
def reporte_reservas_ausentismo_pdf(
    db: Sesion, fecha_desde: date | None = None, fecha_hasta: date | None = None
) -> Response:
    archivo = service.generar_pdf_reservas_ausentismo(db, fecha_desde, fecha_hasta)
    return Response(
        content=archivo.contenido,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{archivo.nombre}"'},
    )
