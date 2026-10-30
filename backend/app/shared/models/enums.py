"""Enumeraciones del diagrama de clases usadas por mas de un modulo."""

from enum import StrEnum


class Estado(StrEnum):
    HABILITADO = "HABILITADO"
    DESHABILITADO = "DESHABILITADO"


class EstadoMesa(StrEnum):
    LIBRE = "LIBRE"
    OCUPADA = "OCUPADA"
    FUERA_DE_SERVICIO = "FUERA_DE_SERVICIO"


class Categoria(StrEnum):
    PLATO = "PLATO"
    POSTRE = "POSTRE"
    BEBIDA = "BEBIDA"
    MENU_DEL_DIA = "MENU_DEL_DIA"
