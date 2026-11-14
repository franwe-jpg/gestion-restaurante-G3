"""Matriz unica rol -> permisos (HU-TR-01, A3)."""

import pytest

from app.shared.models.enums import Rol
from app.shared.permisos import PERMISOS_POR_ROL, Permiso, permisos_de

TODOS = set(Permiso)
SOLO_ENCARGADO = {
    Permiso.CARTA_GESTIONAR,
    Permiso.MENUS_GESTIONAR,
    Permiso.SALON_GESTIONAR,
    Permiso.PAGOS_GESTIONAR,
    Permiso.REPORTES_VER,
}
MOZO = {
    Permiso.CARTA_VER,
    Permiso.MENUS_VER,
    Permiso.SALON_VER,
    Permiso.COMANDAS_VER,
    Permiso.COMANDAS_OPERAR,
    Permiso.COMANDAS_MARCAR_LISTO,
    Permiso.CLIENTES_GESTIONAR,
    Permiso.RESERVAS_VER,
    Permiso.RESERVAS_OPERAR,
    Permiso.PAGOS_OPERAR,
}
CHEF = {
    Permiso.CARTA_VER,
    Permiso.MENUS_VER,
    Permiso.COMANDAS_VER,
    Permiso.COMANDAS_MARCAR_LISTO,
    Permiso.RESERVAS_VER,
}


def test_permisos_de_encargado_es_todo() -> None:
    assert permisos_de([Rol.ENCARGADO]) == TODOS


def test_permisos_de_mozo() -> None:
    assert permisos_de([Rol.MOZO]) == MOZO


def test_permisos_de_chef() -> None:
    assert permisos_de([Rol.CHEF]) == CHEF


def test_el_chef_marca_listo_pero_no_opera_comandas() -> None:
    permisos = permisos_de([Rol.CHEF])

    assert Permiso.COMANDAS_MARCAR_LISTO in permisos
    assert Permiso.COMANDAS_OPERAR not in permisos


def test_permisos_de_mozo_y_chef_es_la_union() -> None:
    assert permisos_de([Rol.MOZO, Rol.CHEF]) == MOZO | CHEF


def test_permisos_de_sin_roles_es_vacio() -> None:
    assert permisos_de([]) == set()


@pytest.mark.parametrize("permiso", sorted(SOLO_ENCARGADO))
def test_permisos_de_gestion_y_reportes_son_solo_del_encargado(permiso: Permiso) -> None:
    con_permiso = {rol for rol in Rol if permiso in PERMISOS_POR_ROL[rol]}

    assert con_permiso == {Rol.ENCARGADO}


def test_toda_la_tabla_cubre_cada_rol() -> None:
    assert set(PERMISOS_POR_ROL) == set(Rol)
