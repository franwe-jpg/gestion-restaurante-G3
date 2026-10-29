"""menus: endpoints HTTP. Solo delega al service (D-02)."""

from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.menus import service
from app.modules.menus.schemas import (
    FiltroMenusDelDia,
    FiltroMenusEjecutivos,
    MenuDelDiaCrear,
    MenuDelDiaListado,
    MenuDelDiaModificar,
    MenuDelDiaSalida,
    MenuEjecutivoActualizar,
    MenuEjecutivoCrear,
    MenuEjecutivoListado,
    MenuEjecutivoSalida,
)
from app.modules.productos import imagenes
from app.shared.paginacion import Pagina

router = APIRouter()

Sesion = Annotated[Session, Depends(get_db)]


def datos_de[T: BaseModel](modelo: type[T]) -> Callable[..., T]:
    """Dependencia que lee la parte `datos` (JSON) de un multipart y la valida con `modelo`.

    Misma forma que la de productos; los errores salen como `RequestValidationError` con `loc`
    bajo `body`, para que el manejador de main.py los responda como 422 con `detalle`.
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


@router.post("/menus-del-dia", status_code=status.HTTP_201_CREATED)
def crear_menu_del_dia(
    datos: Annotated[MenuDelDiaCrear, Depends(datos_de(MenuDelDiaCrear))],
    db: Sesion,
    imagen: Annotated[UploadFile | None, File()] = None,
) -> MenuDelDiaSalida:
    return service.crear_menu_del_dia(db, datos, leer_imagen(imagen))


@router.get("/menus-del-dia")
def listar_menus_del_dia(
    db: Sesion, filtro: Annotated[FiltroMenusDelDia, Query()]
) -> Pagina[MenuDelDiaListado]:
    return service.listar_menus_del_dia(db, filtro, filtro.estado_elegido())


@router.get("/menus-del-dia/{menu_id}")
def consultar_menu_del_dia(menu_id: int, db: Sesion) -> MenuDelDiaSalida:
    return service.obtener_menu_del_dia(db, menu_id)


@router.put("/menus-del-dia/{menu_id}")
def modificar_menu_del_dia(
    menu_id: int,
    datos: Annotated[MenuDelDiaModificar, Depends(datos_de(MenuDelDiaModificar))],
    db: Sesion,
    imagen: Annotated[UploadFile | None, File()] = None,
) -> MenuDelDiaSalida:
    return service.modificar_menu_del_dia(db, menu_id, datos, leer_imagen(imagen))


@router.post("/menus-del-dia/{menu_id}/baja")
def dar_de_baja_menu_del_dia(menu_id: int, db: Sesion) -> MenuDelDiaSalida:
    return service.dar_de_baja_menu_del_dia(db, menu_id)


@router.post("/menus-ejecutivos", status_code=status.HTTP_201_CREATED)
def crear_menu_ejecutivo(datos: MenuEjecutivoCrear, db: Sesion) -> MenuEjecutivoSalida:
    return service.crear_menu_ejecutivo(db, datos)


@router.get("/menus-ejecutivos")
def listar_menus_ejecutivos(
    db: Sesion, filtro: Annotated[FiltroMenusEjecutivos, Query()]
) -> Pagina[MenuEjecutivoListado]:
    return service.listar_menus_ejecutivos(db, filtro)


@router.get("/menus-ejecutivos/{menu_id}")
def consultar_menu_ejecutivo(menu_id: int, db: Sesion) -> MenuEjecutivoSalida:
    return service.obtener_menu_ejecutivo(db, menu_id)


@router.put("/menus-ejecutivos/{menu_id}")
def modificar_menu_ejecutivo(
    menu_id: int, datos: MenuEjecutivoActualizar, db: Sesion
) -> MenuEjecutivoSalida:
    return service.modificar_menu_ejecutivo(db, menu_id, datos)


@router.post("/menus-ejecutivos/{menu_id}/baja")
def dar_de_baja_menu_ejecutivo(menu_id: int, db: Sesion) -> MenuEjecutivoSalida:
    return service.dar_de_baja_menu_ejecutivo(db, menu_id)
