"""Pruebas del modelo de menú ejecutivo (HU-M2-01)."""

from decimal import Decimal

from app.modules.menus.models import MenuEjecutivo
from app.shared.models import Estado


def test_modelo_normaliza_nombre_para_indice_unico() -> None:
    menu = MenuEjecutivo(
        nombre="  Almuerzo Ejecutivo  ",
        precio_fijo=Decimal("1500.00"),
        estado=Estado.HABILITADO,
        seccion_id=1,
    )

    assert menu.nombre == "  Almuerzo Ejecutivo  "
    assert menu.nombre_normalizado == "almuerzo ejecutivo"


def test_modelo_conserva_diacriticos_al_normalizar_nombre() -> None:
    menu = MenuEjecutivo(
        nombre="Menú",
        precio_fijo=Decimal("1.00"),
        estado=Estado.HABILITADO,
        seccion_id=1,
    )

    assert menu.nombre_normalizado == "menú"
