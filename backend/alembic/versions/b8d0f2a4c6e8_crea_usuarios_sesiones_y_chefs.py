"""crea usuarios, sesiones y chefs

Revision ID: b8d0f2a4c6e8
Revises: c3e5a7b9d1f2
Create Date: 2026-11-11 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "b8d0f2a4c6e8"
down_revision: str | None = "c3e5a7b9d1f2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

ESTADO = sa.Enum("HABILITADO", "DESHABILITADO", name="estado", native_enum=False)
ROL = sa.Enum("ENCARGADO", "MOZO", "CHEF", name="rol", native_enum=False)


def upgrade() -> None:
    """Crea las tablas de usuarios y chefs y vincula a los mozos con su usuario."""
    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("correo", sa.String(length=254), nullable=False),
        sa.Column("correo_normalizado", sa.String(length=254), nullable=False),
        sa.Column("contrasena_hash", sa.String(length=60), nullable=False),
        sa.Column("estado", ESTADO, nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ux_usuarios_correo_normalizado", "usuarios", ["correo_normalizado"], unique=True
    )
    op.create_table(
        "usuario_roles",
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("rol", ROL, nullable=False),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("usuario_id", "rol"),
    )
    op.create_table(
        "sesiones",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("creada_en", sa.DateTime(), nullable=False),
        sa.Column("vence_en", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_sesiones_usuario_id", "sesiones", ["usuario_id"])
    op.create_table(
        "chefs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("dni", sa.String(length=8), nullable=False),
        sa.Column("nombre", sa.String(length=60), nullable=False),
        sa.Column("apellido", sa.String(length=60), nullable=False),
        sa.Column("telefono", sa.String(length=30), nullable=True),
        sa.Column("estado", ESTADO, nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dni", name="ux_chefs_dni"),
    )
    op.create_index("ux_chefs_usuario_id", "chefs", ["usuario_id"], unique=True)
    with op.batch_alter_table("mozos") as lote:
        lote.add_column(sa.Column("usuario_id", sa.Integer(), nullable=True))
        lote.create_foreign_key(
            "fk_mozos_usuario_id", "usuarios", ["usuario_id"], ["id"], ondelete="SET NULL"
        )
    op.create_index("ux_mozos_usuario_id", "mozos", ["usuario_id"], unique=True)


def downgrade() -> None:
    """Deshace el esquema en orden inverso sin tocar los datos de mozos."""
    op.drop_index("ux_mozos_usuario_id", table_name="mozos")
    with op.batch_alter_table("mozos") as lote:
        lote.drop_constraint("fk_mozos_usuario_id", type_="foreignkey")
        lote.drop_column("usuario_id")
    op.drop_index("ux_chefs_usuario_id", table_name="chefs")
    op.drop_table("chefs")
    op.drop_index("ix_sesiones_usuario_id", table_name="sesiones")
    op.drop_table("sesiones")
    op.drop_table("usuario_roles")
    op.drop_index("ux_usuarios_correo_normalizado", table_name="usuarios")
    op.drop_table("usuarios")
