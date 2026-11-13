"""Service de Mozo y Chef con credenciales, parametrizado por modelo (HU-TR-01, P4)."""

from dataclasses import dataclass
from typing import Any

import bcrypt
import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.salon import repository, service
from app.modules.salon.models import Chef, Mozo
from app.modules.salon.schemas import (
    ChefCrear,
    ChefModificar,
    MozoCrear,
    MozoModificar,
)
from app.modules.usuarios import service as usuarios_service
from app.modules.usuarios.models import Sesion, Usuario, UsuarioRol
from app.shared.excepciones import (
    DatosInvalidosError,
    NoAutenticadoError,
    NoEncontradoError,
    ReglaDeNegocioError,
)
from app.shared.models import Estado
from app.shared.models.enums import Rol
from app.shared.paginacion import ParametrosPaginacion
from tests.conftest import FabricaUsuario


@dataclass(frozen=True)
class Caso:
    nombre: str
    modelo: type
    rol: Rol
    crear: type
    modificar: type


MOZO = Caso("mozo", Mozo, Rol.MOZO, MozoCrear, MozoModificar)
CHEF = Caso("chef", Chef, Rol.CHEF, ChefCrear, ChefModificar)
CASOS = pytest.mark.parametrize("caso", [MOZO, CHEF], ids=["mozo", "chef"])


def _alta(caso: Caso, **cambios: Any) -> Any:
    datos = {
        "dni": "30123456",
        "nombre": "Juan",
        "apellido": "Fernández",
        "correo": "juan@resto.com",
        "contrasena": "Clave1234",
    }
    return caso.crear.model_validate(datos | cambios)


def _modificacion(caso: Caso, **cambios: Any) -> Any:
    datos = {
        "dni": "30123456",
        "nombre": "Juan",
        "apellido": "Fernández",
        "correo": "juan@resto.com",
    }
    return caso.modificar.model_validate(datos | cambios)


def _funcion(prefijo: str, caso: Caso) -> Any:
    return getattr(service, f"{prefijo}_{caso.nombre}")


def _contar(db: Session, modelo: type) -> int:
    return db.scalar(select(func.count()).select_from(modelo)) or 0


def _persona_sin_usuario(db: Session, caso: Caso, dni: str = "30123456") -> Any:
    persona = caso.modelo(dni=dni, nombre="Juan", apellido="Fernández", estado=Estado.HABILITADO)
    db.add(persona)
    db.commit()
    return persona


@CASOS
def test_alta_crea_persona_y_usuario_vinculado_con_el_rol(db: Session, caso: Caso) -> None:
    salida = _funcion("crear", caso)(db, _alta(caso))

    persona = db.get(caso.modelo, salida.id)
    usuario = db.get(Usuario, persona.usuario_id)
    assert salida.correo == "juan@resto.com"
    assert salida.estado == Estado.HABILITADO
    assert usuario.correo == "juan@resto.com"
    assert usuario.estado == Estado.HABILITADO
    assert bcrypt.checkpw(b"Clave1234", usuario.contrasena_hash.encode())
    assert db.scalars(select(UsuarioRol.rol)).all() == [caso.rol]


@CASOS
def test_alta_con_dni_repetido_es_409_y_no_deja_usuario_huerfano(db: Session, caso: Caso) -> None:
    _persona_sin_usuario(db, caso)

    with pytest.raises(ReglaDeNegocioError, match=f"Ya existe un {caso.nombre} con el DNI"):
        _funcion("crear", caso)(db, _alta(caso))

    assert _contar(db, Usuario) == 0
    assert _contar(db, caso.modelo) == 1


@CASOS
def test_alta_con_correo_repetido_es_409_y_no_crea_la_persona(
    db: Session, fabrica_usuario: FabricaUsuario, caso: Caso
) -> None:
    fabrica_usuario(correo="juan@resto.com")

    with pytest.raises(ReglaDeNegocioError, match="Ya existe un usuario con el correo"):
        _funcion("crear", caso)(db, _alta(caso, correo=" JUAN@resto.com "))

    assert _contar(db, caso.modelo) == 0


@CASOS
def test_alta_convierte_la_carrera_en_conflicto_y_deshace_todo(
    db: Session, monkeypatch: pytest.MonkeyPatch, caso: Caso
) -> None:
    _persona_sin_usuario(db, caso)
    monkeypatch.setattr(repository, "existe_dni", lambda *_, **__: False)
    deshacer: list[bool] = []
    original = db.rollback
    monkeypatch.setattr(db, "rollback", lambda: (deshacer.append(True), original())[1])

    with pytest.raises(ReglaDeNegocioError, match="Ya existe un"):
        _funcion("crear", caso)(db, _alta(caso))

    assert deshacer == [True]
    assert _contar(db, Usuario) == 0


@CASOS
def test_modificacion_con_contrasena_vacia_conserva_la_actual_y_las_sesiones(
    db: Session, caso: Caso
) -> None:
    salida = _funcion("crear", caso)(db, _alta(caso))
    token = usuarios_service.iniciar_sesion(db, "juan@resto.com", "Clave1234").token

    resultado = _funcion("modificar", caso)(db, salida.id, _modificacion(caso, telefono="123"))

    assert resultado.telefono == "123"
    assert usuarios_service.usuario_de_token(db, token) is not None
    assert usuarios_service.iniciar_sesion(db, "juan@resto.com", "Clave1234")


@CASOS
def test_modificacion_con_contrasena_nueva_cambia_credenciales_e_invalida_sesiones(
    db: Session, caso: Caso
) -> None:
    salida = _funcion("crear", caso)(db, _alta(caso))
    token = usuarios_service.iniciar_sesion(db, "juan@resto.com", "Clave1234").token

    _funcion("modificar", caso)(
        db, salida.id, _modificacion(caso, correo="nuevo@resto.com", contrasena="NuevaClave9")
    )

    assert usuarios_service.usuario_de_token(db, token) is None
    assert usuarios_service.iniciar_sesion(db, "nuevo@resto.com", "NuevaClave9")
    with pytest.raises(NoAutenticadoError):
        usuarios_service.iniciar_sesion(db, "juan@resto.com", "Clave1234")


@CASOS
def test_modificacion_con_correo_de_otro_usuario_es_409_y_no_cambia_nada(
    db: Session, fabrica_usuario: FabricaUsuario, caso: Caso
) -> None:
    fabrica_usuario(correo="ana@resto.com")
    salida = _funcion("crear", caso)(db, _alta(caso))

    with pytest.raises(ReglaDeNegocioError, match="Ya existe un usuario con el correo"):
        _funcion("modificar", caso)(
            db, salida.id, _modificacion(caso, correo="ana@resto.com", telefono="999")
        )

    db.expire_all()
    assert db.get(caso.modelo, salida.id).telefono is None


@CASOS
def test_modificacion_con_el_mismo_dni_y_correo_propios_no_es_repetido(
    db: Session, caso: Caso
) -> None:
    salida = _funcion("crear", caso)(db, _alta(caso))

    resultado = _funcion("modificar", caso)(db, salida.id, _modificacion(caso))

    assert resultado.correo == "juan@resto.com"


@CASOS
def test_modificacion_de_persona_sin_usuario_y_sin_contrasena_es_422(
    db: Session, caso: Caso
) -> None:
    persona = _persona_sin_usuario(db, caso)

    with pytest.raises(DatosInvalidosError):
        _funcion("modificar", caso)(db, persona.id, _modificacion(caso, nombre="Otro"))

    db.expire_all()
    assert db.get(caso.modelo, persona.id).nombre == "Juan"
    assert _contar(db, Usuario) == 0


@CASOS
def test_modificacion_de_persona_sin_usuario_con_contrasena_crea_su_usuario(
    db: Session, caso: Caso
) -> None:
    persona = _persona_sin_usuario(db, caso)

    salida = _funcion("modificar", caso)(
        db, persona.id, _modificacion(caso, contrasena="Clave1234")
    )

    assert salida.correo == "juan@resto.com"
    assert db.scalars(select(UsuarioRol.rol)).all() == [caso.rol]
    assert (
        usuarios_service.iniciar_sesion(db, "juan@resto.com", "Clave1234").usuario.nombre == "Juan"
    )


@CASOS
def test_baja_deshabilita_el_usuario_y_borra_sus_sesiones(db: Session, caso: Caso) -> None:
    salida = _funcion("crear", caso)(db, _alta(caso))
    token = usuarios_service.iniciar_sesion(db, "juan@resto.com", "Clave1234").token

    resultado = _funcion("dar_de_baja", caso)(db, salida.id)

    assert resultado.estado == Estado.DESHABILITADO
    assert db.scalar(select(Usuario.estado)) == Estado.DESHABILITADO
    assert _contar(db, Sesion) == 0
    assert usuarios_service.usuario_de_token(db, token) is None


@CASOS
def test_baja_de_persona_sin_usuario_no_tiene_otros_efectos(db: Session, caso: Caso) -> None:
    persona = _persona_sin_usuario(db, caso)

    resultado = _funcion("dar_de_baja", caso)(db, persona.id)

    assert resultado.estado == Estado.DESHABILITADO
    assert resultado.correo is None
    assert _contar(db, Usuario) == 0


@CASOS
def test_baja_repetida_es_409(db: Session, caso: Caso) -> None:
    salida = _funcion("crear", caso)(db, _alta(caso))
    _funcion("dar_de_baja", caso)(db, salida.id)

    with pytest.raises(ReglaDeNegocioError, match=f"El {caso.nombre} ya está dado de baja"):
        _funcion("dar_de_baja", caso)(db, salida.id)


@CASOS
def test_persona_inexistente_es_404_en_modificar_y_baja(db: Session, caso: Caso) -> None:
    mensaje = f"El {caso.nombre} 999 no existe"

    with pytest.raises(NoEncontradoError, match=mensaje):
        _funcion("modificar", caso)(db, 999, _modificacion(caso))
    with pytest.raises(NoEncontradoError, match=mensaje):
        _funcion("dar_de_baja", caso)(db, 999)


@CASOS
def test_listado_trae_los_correos_en_una_sola_consulta(
    db: Session, monkeypatch: pytest.MonkeyPatch, caso: Caso
) -> None:
    for numero in range(3):
        _funcion("crear", caso)(
            db, _alta(caso, dni=f"3000000{numero}", correo=f"p{numero}@resto.com")
        )
    _persona_sin_usuario(db, caso, dni="31000000")
    llamadas: list[list[int]] = []
    original = usuarios_service.correos_por_id
    monkeypatch.setattr(
        usuarios_service,
        "correos_por_id",
        lambda d, ids: (llamadas.append(ids), original(d, ids))[1],
    )

    pagina = getattr(service, f"listar_{caso.nombre}s")(
        db, ParametrosPaginacion(limit=10, offset=0)
    )

    assert len(llamadas) == 1
    assert pagina.total == 4
    assert sorted(item.correo or "" for item in pagina.items) == [
        "",
        "p0@resto.com",
        "p1@resto.com",
        "p2@resto.com",
    ]
