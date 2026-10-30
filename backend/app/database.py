"""Conexion y sesion de SQLite (D-09, D-10)."""

import logging
import time
from collections.abc import Iterator
from sqlite3 import Connection as SQLiteConnection

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.engine import Connection
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

logger = logging.getLogger(__name__)

BUSY_TIMEOUT_MS = 5000
UMBRAL_TRANSACCION_S = 0.2  # RNF-REN-03: ninguna escritura retiene el bloqueo mas de 200 ms


class Base(DeclarativeBase):
    """Clase base de todos los modelos."""


def crear_motor(url: str) -> Engine:
    """Crea el motor de SQLite con WAL, busy_timeout y claves foraneas activadas."""
    motor = create_engine(url, connect_args={"check_same_thread": False})

    @event.listens_for(motor, "connect")
    def configurar_sqlite(conexion: SQLiteConnection, _registro: object) -> None:
        cursor = conexion.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute(f"PRAGMA busy_timeout={BUSY_TIMEOUT_MS}")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    @event.listens_for(motor, "begin")
    def iniciar_transaccion(conexion: Connection) -> None:
        conexion.info["inicio_transaccion"] = time.perf_counter()

    @event.listens_for(motor, "commit")
    def medir_transaccion(conexion: Connection) -> None:
        inicio = conexion.info.pop("inicio_transaccion", None)
        if inicio is not None and time.perf_counter() - inicio > UMBRAL_TRANSACCION_S:
            logger.warning("Transaccion de mas de %.0f ms", UMBRAL_TRANSACCION_S * 1000)

    return motor


motor = crear_motor(get_settings().database_url)
SessionLocal = sessionmaker(bind=motor, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """Entrega una sesion por solicitud y la cierra al terminar."""
    with SessionLocal() as sesion:
        yield sesion
