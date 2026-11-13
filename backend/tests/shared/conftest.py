"""Fixtures de datos reales de M4 y M6 reutilizados por la prueba de la matriz de permisos."""

from tests.modules.atencion.conftest import comanda
from tests.modules.pagos.conftest import catalogo, fabrica_comanda, fabrica_medio_pago

__all__ = ["catalogo", "comanda", "fabrica_comanda", "fabrica_medio_pago"]
