"""Configuracion de rondas de bcrypt (HU-TR-01, A6)."""

import pytest

from app.config import Settings


def test_bcrypt_rondas_por_defecto_es_12(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("BCRYPT_RONDAS", raising=False)

    assert Settings(_env_file=None).bcrypt_rondas == 12


def test_bcrypt_rondas_se_lee_del_entorno(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BCRYPT_RONDAS", "4")

    assert Settings(_env_file=None).bcrypt_rondas == 4
