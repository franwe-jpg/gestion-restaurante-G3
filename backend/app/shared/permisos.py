"""Matriz unica rol -> permisos (A3). No depende de FastAPI: la usan service y seguridad."""

from collections.abc import Iterable
from enum import StrEnum

from app.shared.models.enums import Rol


class Permiso(StrEnum):
    CARTA_VER = "CARTA_VER"
    CARTA_GESTIONAR = "CARTA_GESTIONAR"
    MENUS_VER = "MENUS_VER"
    MENUS_GESTIONAR = "MENUS_GESTIONAR"
    SALON_VER = "SALON_VER"
    SALON_GESTIONAR = "SALON_GESTIONAR"
    COMANDAS_VER = "COMANDAS_VER"
    COMANDAS_OPERAR = "COMANDAS_OPERAR"
    CLIENTES_GESTIONAR = "CLIENTES_GESTIONAR"
    RESERVAS_VER = "RESERVAS_VER"
    RESERVAS_OPERAR = "RESERVAS_OPERAR"
    PAGOS_OPERAR = "PAGOS_OPERAR"
    PAGOS_GESTIONAR = "PAGOS_GESTIONAR"
    REPORTES_VER = "REPORTES_VER"


PERMISOS_POR_ROL: dict[Rol, frozenset[Permiso]] = {
    Rol.ENCARGADO: frozenset(Permiso),
    Rol.MOZO: frozenset(
        {
            Permiso.CARTA_VER,
            Permiso.MENUS_VER,
            Permiso.SALON_VER,
            Permiso.COMANDAS_VER,
            Permiso.COMANDAS_OPERAR,
            Permiso.CLIENTES_GESTIONAR,
            Permiso.RESERVAS_VER,
            Permiso.RESERVAS_OPERAR,
            Permiso.PAGOS_OPERAR,
        }
    ),
    Rol.CHEF: frozenset(
        {
            Permiso.CARTA_VER,
            Permiso.MENUS_VER,
            Permiso.COMANDAS_VER,
            Permiso.RESERVAS_VER,
        }
    ),
}


def permisos_de(roles: Iterable[Rol]) -> set[Permiso]:
    """Union de los permisos de los roles; sin roles no hay permisos."""
    permisos: set[Permiso] = set()
    for rol in roles:
        permisos |= PERMISOS_POR_ROL[rol]
    return permisos
