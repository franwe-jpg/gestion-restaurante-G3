"""Rutas de Cliente y Comanda; delegan al servicio de M4."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.atencion import adaptadores, service
from app.modules.atencion.reporte import TurnoReporte
from app.modules.atencion.schemas import (
    ClienteModificar,
    ClienteSalida,
    ComandaModificar,
    ComandaMozoAsignar,
    EntregaDetalle,
    EntregasComanda,
    FiltroClientes,
    PendientesComanda,
    ReporteComandasTicketPromedio,
)
from app.shared.contratos.comanda import ComandaCrear, ComandaResumen, ComandaSalida, EstadoComanda
from app.shared.paginacion import LIMIT_MAXIMO, LIMIT_POR_DEFECTO, Pagina, ParametrosPaginacion

router = APIRouter(tags=["Atención al Público"])
Sesion = Annotated[Session, Depends(get_db)]


def obtener_mesas_port() -> service.MesasPort:
    return adaptadores.MesasDeSalon()


def obtener_catalogo_port() -> service.CatalogoPort:
    return adaptadores.CatalogoDeCarta()


def obtener_mozos_port() -> service.MozosPort:
    return adaptadores.MozosDeSalon()


@router.post("/comandas", status_code=201)
def crear_comanda(
    datos: ComandaCrear,
    db: Sesion,
    mesas: Annotated[service.MesasPort, Depends(obtener_mesas_port)],
    catalogo: Annotated[service.CatalogoPort, Depends(obtener_catalogo_port)],
    mozos: Annotated[service.MozosPort, Depends(obtener_mozos_port)],
) -> ComandaSalida:
    return service.crear_comanda(db, datos, mesas, catalogo, mozos)


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


@router.get("/reportes/comandas-ticket-promedio")
def generar_reporte_comandas(
    db: Sesion,
    fecha_desde: date | None = None,
    fecha_hasta: date | None = None,
    turno: TurnoReporte | None = None,
) -> ReporteComandasTicketPromedio:
    return service.generar_reporte_comandas(db, fecha_desde, fecha_hasta, turno)


@router.post("/comandas/{comanda_id}/cerrar")
def cerrar_comanda(
    comanda_id: Annotated[int, Path(gt=0)],
    db: Sesion,
    mesas: Annotated[service.MesasPort, Depends(obtener_mesas_port)],
) -> ComandaSalida:
    return service.cerrar_comanda(db, comanda_id, mesas)


@router.post("/comandas/{comanda_id}/anular")
def anular_comanda(
    comanda_id: Annotated[int, Path(gt=0)],
    db: Sesion,
    mesas: Annotated[service.MesasPort, Depends(obtener_mesas_port)],
) -> ComandaSalida:
    return service.anular_comanda(db, comanda_id, mesas)


@router.get("/comandas/{comanda_id}/pendientes")
def consultar_pendientes(comanda_id: Annotated[int, Path(gt=0)], db: Sesion) -> PendientesComanda:
    return service.consultar_pendientes(db, comanda_id)


@router.get("/comandas/{comanda_id}/detalles")
def consultar_entregas(comanda_id: Annotated[int, Path(gt=0)], db: Sesion) -> EntregasComanda:
    return service.consultar_entregas(db, comanda_id)


@router.put("/comandas/{comanda_id}/detalles/{detalle_id}/entrega")
def registrar_entrega(
    comanda_id: Annotated[int, Path(gt=0)],
    detalle_id: Annotated[int, Path(gt=0)],
    datos: EntregaDetalle,
    db: Sesion,
) -> EntregasComanda:
    return service.registrar_entrega(db, comanda_id, detalle_id, datos)


@router.put("/comandas/{comanda_id}")
def modificar_comanda(
    comanda_id: Annotated[int, Path(gt=0)],
    datos: ComandaModificar,
    db: Sesion,
    catalogo: Annotated[service.CatalogoPort, Depends(obtener_catalogo_port)],
) -> ComandaSalida:
    return service.modificar_comanda(db, comanda_id, datos, catalogo)


@router.put("/comandas/{comanda_id}/mozo")
def asignar_mozo_comanda(
    comanda_id: Annotated[int, Path(gt=0)],
    datos: ComandaMozoAsignar,
    db: Sesion,
    mozos: Annotated[service.MozosPort, Depends(obtener_mozos_port)],
) -> ComandaSalida:
    return service.asignar_mozo_comanda(db, comanda_id, datos.mozo_id, mozos)


@router.post("/comandas/{comanda_id}/reabrir")
def reabrir_comanda(
    comanda_id: Annotated[int, Path(gt=0)],
    db: Sesion,
    mesas: Annotated[service.MesasPort, Depends(obtener_mesas_port)],
) -> ComandaSalida:
    return service.reabrir_comanda(db, comanda_id, mesas)


@router.get("/comandas/{comanda_id}")
def obtener_comanda(comanda_id: Annotated[int, Path(gt=0)], db: Sesion) -> ComandaSalida:
    return service.obtener_comanda(db, comanda_id)


@router.put("/clientes/{cliente_id}")
def modificar_cliente(cliente_id: int, datos: ClienteModificar, db: Sesion) -> ClienteSalida:
    return service.modificar_cliente(db, cliente_id, datos)


@router.get("/clientes")
def listar_clientes(
    db: Sesion, filtro: Annotated[FiltroClientes, Query()]
) -> Pagina[ClienteSalida]:
    return service.listar_clientes(db, filtro, filtro.q)
