"""Pruebas del modelo de promoción (HU-M2-07)."""

from app.modules.menus.models import Promocion
from app.shared.models import Estado


def test_modelo_normaliza_nombre_para_indice_unico() -> None:
    promocion = Promocion(nombre="  Happy Hour  ", estado=Estado.HABILITADO)

    assert promocion.nombre == "  Happy Hour  "
    assert promocion.nombre_normalizado == "happy hour"


def test_modelo_conserva_diacriticos_al_normalizar_nombre() -> None:
    promocion = Promocion(nombre="Promoción de invierno", estado=Estado.HABILITADO)

    assert promocion.nombre_normalizado == "promoción de invierno"
