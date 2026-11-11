"""Script del primer encargado (HU-TR-01, P6). `getpass` y la base se simulan."""

from collections.abc import Callable
from contextlib import nullcontext

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.usuarios import service
from app.modules.usuarios.models import Usuario
from app.shared.models import Estado
from app.shared.models.enums import Rol
from scripts import crear_encargado


@pytest.fixture
def ejecutar(db: Session, monkeypatch: pytest.MonkeyPatch) -> Callable[..., int]:
    """Corre `main` con la base de la prueba y las contrasenas que se indiquen."""
    monkeypatch.setattr(crear_encargado, "abrir_sesion", lambda: nullcontext(db))

    def correr(correo: str, *contrasenas: str) -> int:
        respuestas = iter(contrasenas)
        monkeypatch.setattr(crear_encargado.getpass, "getpass", lambda _mensaje: next(respuestas))
        return crear_encargado.main(["--correo", correo])

    return correr


def _cantidad(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(Usuario)) or 0


def test_crea_un_encargado_habilitado_que_puede_iniciar_sesion(
    db: Session, ejecutar: Callable[..., int]
) -> None:
    codigo = ejecutar("jefe@resto.com", "Clave1234", "Clave1234")

    assert codigo == 0
    usuario = db.scalar(select(Usuario))
    assert usuario.estado == Estado.HABILITADO
    assert usuario.contrasena_hash.startswith("$2")
    sesion = service.iniciar_sesion(db, "jefe@resto.com", "Clave1234")
    assert sesion.usuario.roles == [Rol.ENCARGADO]


def test_correo_repetido_termina_con_error_y_no_cambia_la_base(
    db: Session, ejecutar: Callable[..., int], capsys: pytest.CaptureFixture[str]
) -> None:
    ejecutar("jefe@resto.com", "Clave1234", "Clave1234")

    codigo = ejecutar("JEFE@resto.com", "OtraClave99", "OtraClave99")

    assert codigo != 0
    assert "Ya existe un usuario con el correo" in capsys.readouterr().err
    assert _cantidad(db) == 1


def test_contrasena_de_7_caracteres_termina_con_error_y_no_cambia_la_base(
    db: Session, ejecutar: Callable[..., int]
) -> None:
    codigo = ejecutar("jefe@resto.com", "1234567", "1234567")

    assert codigo != 0
    assert _cantidad(db) == 0


def test_las_dos_contrasenas_deben_coincidir(
    db: Session, ejecutar: Callable[..., int], capsys: pytest.CaptureFixture[str]
) -> None:
    codigo = ejecutar("jefe@resto.com", "Clave1234", "Clave12345")

    assert codigo != 0
    assert "no coinciden" in capsys.readouterr().err
    assert _cantidad(db) == 0


def test_el_correo_es_obligatorio(capsys: pytest.CaptureFixture[str]) -> None:
    with pytest.raises(SystemExit) as salida:
        crear_encargado.main([])

    assert salida.value.code != 0
