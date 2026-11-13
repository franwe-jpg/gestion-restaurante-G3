"""usuarios: acceso a datos. Nunca confirma la transaccion: lo hace el service (D-10)."""

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.modules.usuarios.models import Sesion, Usuario, UsuarioRol
from app.shared.models.enums import Rol

# A8: salon es dueno de `Mozo` y `Chef`; aca solo se leen sus columnas por nombre, sin importar
# sus modelos (S0-05, 3.3).
_MOZOS = sa.table("mozos", sa.column("usuario_id"), sa.column("nombre"), sa.column("apellido"))
_CHEFS = sa.table("chefs", sa.column("usuario_id"), sa.column("nombre"), sa.column("apellido"))


def obtener_por_correo_normalizado(db: Session, correo_normalizado: str) -> Usuario | None:
    consulta = select(Usuario).where(Usuario.correo_normalizado == correo_normalizado)
    return db.scalar(consulta)


def obtener(db: Session, usuario_id: int) -> Usuario | None:
    return db.get(Usuario, usuario_id)


def existe_correo(db: Session, correo_normalizado: str, excluir_id: int | None = None) -> bool:
    consulta = select(Usuario.id).where(Usuario.correo_normalizado == correo_normalizado)
    if excluir_id is not None:
        consulta = consulta.where(Usuario.id != excluir_id)
    return db.scalar(consulta.limit(1)) is not None


def agregar(db: Session, usuario: Usuario, roles: list[Rol]) -> None:
    db.add(usuario)
    db.flush()
    db.add_all(UsuarioRol(usuario_id=usuario.id, rol=rol) for rol in roles)
    db.flush()


def roles_de(db: Session, usuario_id: int) -> list[Rol]:
    consulta = select(UsuarioRol.rol).where(UsuarioRol.usuario_id == usuario_id)
    return sorted(db.scalars(consulta).all())


def persona_vinculada(db: Session, usuario_id: int) -> tuple[str, str] | None:
    """Nombre y apellido del mozo o chef vinculado; None para el encargado."""
    for tabla in (_MOZOS, _CHEFS):
        fila = db.execute(
            select(tabla.c.nombre, tabla.c.apellido).where(tabla.c.usuario_id == usuario_id)
        ).first()
        if fila is not None:
            return fila.nombre, fila.apellido
    return None


def correos_por_id(db: Session, ids: list[int]) -> dict[int, str]:
    if not ids:
        return {}
    filas = db.execute(select(Usuario.id, Usuario.correo).where(Usuario.id.in_(ids))).all()
    return {fila.id: fila.correo for fila in filas}


def agregar_sesion(db: Session, sesion: Sesion) -> None:
    db.add(sesion)
    db.flush()


def obtener_sesion_por_hash(db: Session, token_hash: str) -> Sesion | None:
    return db.scalar(select(Sesion).where(Sesion.token_hash == token_hash))


def borrar_sesion_por_hash(db: Session, token_hash: str) -> None:
    db.execute(delete(Sesion).where(Sesion.token_hash == token_hash))


def borrar_sesiones_de(db: Session, usuario_id: int) -> None:
    db.execute(delete(Sesion).where(Sesion.usuario_id == usuario_id))


def borrar_vencidas(db: Session, ahora: datetime) -> None:
    db.execute(delete(Sesion).where(Sesion.vence_en <= ahora))
