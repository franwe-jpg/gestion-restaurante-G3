"""Errores de negocio comunes. El manejador global de main.py los convierte en HTTP (D-26)."""


class NoEncontradoError(Exception):
    """El recurso pedido no existe (404)."""


class ReglaDeNegocioError(Exception):
    """La operacion choca con una regla de negocio (409)."""
