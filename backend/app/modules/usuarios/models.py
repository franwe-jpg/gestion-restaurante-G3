"""usuarios: tablas del modulo (usuarios, roles y sesiones)."""

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, validates

from app.database import Base
from app.shared.models import Estado
from app.shared.models.enums import Rol


class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = (
        # A1: el correo es unico sin distinguir mayusculas ni espacios.
        sa.Index("ux_usuarios_correo_normalizado", "correo_normalizado", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    correo: Mapped[str] = mapped_column(sa.String(254))
    # No se expone en la API: lo mantiene el validador de `correo`.
    correo_normalizado: Mapped[str] = mapped_column(sa.String(254))
    contrasena_hash: Mapped[str] = mapped_column(sa.String(60))
    estado: Mapped[Estado] = mapped_column(
        sa.Enum(Estado, native_enum=False), default=Estado.HABILITADO
    )

    @validates("correo")
    def _sincronizar_correo_normalizado(self, _clave: str, correo: str) -> str:
        self.correo_normalizado = correo.strip().casefold()
        return correo


class UsuarioRol(Base):
    __tablename__ = "usuario_roles"

    usuario_id: Mapped[int] = mapped_column(
        sa.ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True
    )
    rol: Mapped[Rol] = mapped_column(sa.Enum(Rol, native_enum=False), primary_key=True)


class Sesion(Base):
    __tablename__ = "sesiones"

    id: Mapped[int] = mapped_column(primary_key=True)
    token_hash: Mapped[str] = mapped_column(sa.String(64), unique=True)
    usuario_id: Mapped[int] = mapped_column(
        sa.ForeignKey("usuarios.id", ondelete="CASCADE"), index=True
    )
    # UTC sin zona horaria (A7).
    creada_en: Mapped[datetime]
    vence_en: Mapped[datetime]
