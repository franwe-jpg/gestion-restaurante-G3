"""productos: endpoints HTTP. Solo delega al service (D-02)."""

from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.productos import imagenes, service
from app.modules.productos.schemas import (
    FiltroSecciones,
    PlatoCrear,
    PostreCrear,
    ProductoSalida,
    ProductoSeleccionable,
    SeccionCrear,
    SeccionListado,
    SeccionSalida,
)
from app.shared.paginacion import Pagina, ParametrosPaginacion

router = APIRouter()

Sesion = Annotated[Session, Depends(get_db)]
Paginacion = Annotated[ParametrosPaginacion, Query()]


def datos_de[T: BaseModel](modelo: type[T]) -> Callable[..., T]:
    """Dependencia que lee la parte `datos` (JSON) de un multipart y la valida con `modelo`.

    Los errores salen como `RequestValidationError` con `loc` bajo `body`, para que el manejador
    de main.py los responda como 422 con `detalle` (B2, B3).
    """

    def dependencia(datos: Annotated[str, Form()]) -> T:
        try:
            return modelo.model_validate_json(datos)
        except ValidationError as error:
            fallas = [
                {**falla, "loc": ("body", *(falla["loc"] or ("datos",)))}
                for falla in error.errors(include_url=False, include_context=False)
            ]
            raise RequestValidationError(fallas) from error

    return dependencia


def leer_imagen(imagen: UploadFile | None) -> bytes | None:
    """Lee a lo sumo 5 MB + 1 byte: el service rechaza lo que supere el tope (protege la RAM)."""
    if imagen is None:
        return None
    return imagen.file.read(imagenes.TAMANO_MAXIMO_BYTES + 1)


@router.post("/platos", status_code=status.HTTP_201_CREATED)
def crear_plato(
    datos: Annotated[PlatoCrear, Depends(datos_de(PlatoCrear))],
    db: Sesion,
    imagen: Annotated[UploadFile | None, File()] = None,
) -> ProductoSalida:
    return service.crear_producto(db, datos, leer_imagen(imagen))


@router.get("/platos/{producto_id}")
def consultar_plato(producto_id: int, db: Sesion) -> ProductoSalida:
    return service.obtener_producto(db, PlatoCrear.CATEGORIA, producto_id)


@router.post("/postres", status_code=status.HTTP_201_CREATED)
def crear_postre(
    datos: Annotated[PostreCrear, Depends(datos_de(PostreCrear))],
    db: Sesion,
    imagen: Annotated[UploadFile | None, File()] = None,
) -> ProductoSalida:
    return service.crear_producto(db, datos, leer_imagen(imagen))


@router.post("/secciones", status_code=status.HTTP_201_CREATED)
def crear_seccion(datos: SeccionCrear, db: Sesion) -> SeccionSalida:
    return service.crear_seccion(db, datos)


@router.get("/secciones")
def listar_secciones(
    db: Sesion, filtro: Annotated[FiltroSecciones, Query()]
) -> Pagina[SeccionListado]:
    return service.listar_secciones(db, filtro, filtro.estado)


@router.get("/productos")
def listar_productos(db: Sesion, paginacion: Paginacion) -> Pagina[ProductoSeleccionable]:
    return service.listar_productos(db, paginacion)
