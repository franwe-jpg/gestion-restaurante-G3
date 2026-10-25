"""Carpeta de imagenes: configuracion y montaje de /media (diseno B8)."""

import io
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image

from app.config import Settings, get_settings
from app.main import montar_media


def _jpeg() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (8, 4), "red").save(buffer, "JPEG")
    return buffer.getvalue()


def test_settings_media_dir_por_defecto_es_la_carpeta_media() -> None:
    assert Settings(_env_file=None).media_dir == "./media"


def test_settings_media_dir_se_lee_de_la_variable_de_entorno(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("MEDIA_DIR", "/otra/carpeta")

    assert Settings(_env_file=None).media_dir == "/otra/carpeta"
    get_settings.cache_clear()


def test_media_sirve_el_archivo_guardado_como_jpeg(tmp_path: Path) -> None:
    (tmp_path / "abc.jpg").write_bytes(_jpeg())
    app = FastAPI()
    montar_media(app, tmp_path)

    respuesta = TestClient(app).get("/media/abc.jpg")

    assert respuesta.status_code == 200
    assert respuesta.headers["content-type"] == "image/jpeg"
    assert respuesta.content == _jpeg()


def test_media_responde_404_si_el_archivo_no_existe(tmp_path: Path) -> None:
    app = FastAPI()
    montar_media(app, tmp_path)

    assert TestClient(app).get("/media/no-existe.jpg").status_code == 404


def test_montar_media_no_crea_la_carpeta(tmp_path: Path) -> None:
    carpeta = tmp_path / "inexistente"

    montar_media(FastAPI(), carpeta)

    assert not carpeta.exists()
