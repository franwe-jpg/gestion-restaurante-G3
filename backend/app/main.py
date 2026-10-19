"""Punto de entrada: crea la aplicacion FastAPI y registra los routers de cada modulo."""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import API_PREFIX, get_settings
from app.shared.excepciones import NoEncontradoError, ReglaDeNegocioError

app = FastAPI(title="Sistema de Gestion de Restaurante", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[get_settings().cors_origin],  # RNF-SEG-07: sin comodin
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(NoEncontradoError)
def manejar_no_encontrado(_solicitud: Request, error: NoEncontradoError) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detalle": str(error)})


@app.exception_handler(ReglaDeNegocioError)
def manejar_regla_de_negocio(_solicitud: Request, error: ReglaDeNegocioError) -> JSONResponse:
    return JSONResponse(status_code=409, content={"detalle": str(error)})


@app.get(f"{API_PREFIX}/salud")
def salud() -> dict[str, str]:
    return {"estado": "ok"}
