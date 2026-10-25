"""Entidades compartidas entre modulos (D-05)."""

from app.shared.models.enums import Categoria, Estado
from app.shared.models.producto import Producto

__all__ = ["Categoria", "Estado", "Producto"]
