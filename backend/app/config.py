"""Configuracion de la aplicacion, leida de variables de entorno (D-12)."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

API_PREFIX = "/api/v1"


class Settings(BaseSettings):
    """Valores por defecto para desarrollo. Se sobrescriben con el archivo .env."""

    database_url: str = "sqlite:///./restaurante.db"
    cors_origin: str = "http://localhost:5173"
    media_dir: str = "./media"  # carpeta de las imagenes subidas (se sirve en /media)

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
