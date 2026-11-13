"""Punto de entrada: crea la aplicacion FastAPI y registra los routers de cada modulo."""

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import API_PREFIX, get_settings
from app.modules.atencion.router import router as atencion_router
from app.modules.atencion.service import ComandaAbiertaError, EntregasPendientesError
from app.modules.menus.router import router as menus_router
from app.modules.pagos.router import router as pagos_router
from app.modules.productos.router import router as productos_router
from app.modules.reservas.router import router as reservas_router
from app.modules.salon.router import router as salon_router
from app.modules.usuarios.router import router as usuarios_router
from app.shared.excepciones import (
    DatosInvalidosError,
    NoAutenticadoError,
    NoEncontradoError,
    ReglaDeNegocioError,
    SinPermisoError,
)

app = FastAPI(title="Sistema de Gestion de Restaurante", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[get_settings().cors_origin],  # RNF-SEG-07: sin comodin
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(atencion_router, prefix=API_PREFIX)
app.include_router(menus_router, prefix=API_PREFIX)
app.include_router(pagos_router, prefix=API_PREFIX)
app.include_router(productos_router, prefix=API_PREFIX)
app.include_router(salon_router, prefix=API_PREFIX)
app.include_router(reservas_router, prefix=API_PREFIX)
app.include_router(usuarios_router, prefix=API_PREFIX)


def montar_media(aplicacion: FastAPI, directorio: str | Path) -> None:
    """Sirve las imagenes guardadas en /media. No crea la carpeta: la crea quien escribe (B8)."""
    aplicacion.mount("/media", StaticFiles(directory=directorio, check_dir=False), name="media")


montar_media(app, get_settings().media_dir)


@app.exception_handler(NoEncontradoError)
def manejar_no_encontrado(_solicitud: Request, error: NoEncontradoError) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detalle": str(error)})


@app.exception_handler(ReglaDeNegocioError)
def manejar_regla_de_negocio(_solicitud: Request, error: ReglaDeNegocioError) -> JSONResponse:
    return JSONResponse(status_code=409, content={"detalle": str(error)})


@app.exception_handler(EntregasPendientesError)
def manejar_entregas_pendientes(
    _solicitud: Request, error: EntregasPendientesError
) -> JSONResponse:
    return JSONResponse(
        status_code=409,
        content={
            "detalle": str(error),
            "comanda_id": error.comanda_id,
            "pendientes": [detalle.model_dump() for detalle in error.pendientes],
        },
    )


@app.exception_handler(ComandaAbiertaError)
def manejar_comanda_abierta(_solicitud: Request, error: ComandaAbiertaError) -> JSONResponse:
    return JSONResponse(
        status_code=409, content={"detalle": str(error), "comanda_id": error.comanda_id}
    )


@app.exception_handler(DatosInvalidosError)
def manejar_datos_invalidos_de_negocio(
    _solicitud: Request, error: DatosInvalidosError
) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detalle": str(error)})


@app.exception_handler(NoAutenticadoError)
def manejar_no_autenticado(_solicitud: Request, error: NoAutenticadoError) -> JSONResponse:
    return JSONResponse(
        status_code=401,
        content={"detalle": str(error)},
        headers={"WWW-Authenticate": "Bearer"},
    )


@app.exception_handler(SinPermisoError)
def manejar_sin_permiso(_solicitud: Request, error: SinPermisoError) -> JSONResponse:
    return JSONResponse(status_code=403, content={"detalle": str(error)})


@app.exception_handler(RequestValidationError)
def manejar_datos_invalidos(_solicitud: Request, error: RequestValidationError) -> JSONResponse:
    campos = "; ".join(
        f"{'.'.join(str(parte) for parte in falla['loc'][1:])}: {falla['msg']}"
        for falla in error.errors()
    )
    return JSONResponse(status_code=422, content={"detalle": f"Datos invalidos. {campos}"})


@app.exception_handler(StarletteHTTPException)
def manejar_error_http(_solicitud: Request, error: StarletteHTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code,
        content={"detalle": error.detail},
        headers=error.headers,
    )


@app.exception_handler(Exception)
def manejar_error_inesperado(_solicitud: Request, _error: Exception) -> JSONResponse:
    """D-26: una falla no controlada responde `detalle` sin trazas ni datos internos."""
    return JSONResponse(status_code=500, content={"detalle": "Error interno del servidor"})


@app.get(f"{API_PREFIX}/salud")
def salud() -> dict[str, str]:
    return {"estado": "ok"}
