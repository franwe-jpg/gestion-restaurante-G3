"""Punto de entrada: crea la aplicacion FastAPI y registra los routers de cada modulo."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import API_PREFIX, get_settings
from app.modules.productos.router import router as productos_router
from app.shared.excepciones import NoEncontradoError, ReglaDeNegocioError

app = FastAPI(title="Sistema de Gestion de Restaurante", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[get_settings().cors_origin],  # RNF-SEG-07: sin comodin
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(productos_router, prefix=API_PREFIX)


@app.exception_handler(NoEncontradoError)
def manejar_no_encontrado(_solicitud: Request, error: NoEncontradoError) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detalle": str(error)})


@app.exception_handler(ReglaDeNegocioError)
def manejar_regla_de_negocio(_solicitud: Request, error: ReglaDeNegocioError) -> JSONResponse:
    return JSONResponse(status_code=409, content={"detalle": str(error)})


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


@app.get(f"{API_PREFIX}/salud")
def salud() -> dict[str, str]:
    return {"estado": "ok"}
