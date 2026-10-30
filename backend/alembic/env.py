"""Entorno de Alembic: toma la URL de la configuracion de la app y los modelos de cada modulo."""

from importlib import import_module
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context
from app.config import get_settings
from app.database import Base

# Cada modulo registra aqui sus modelos para que Alembic los vea (autogenerate).
MODULOS_CON_MODELOS = [
    "app.shared.models",
    "app.modules.productos.models",
    "app.modules.menus.models",
    "app.modules.salon.models",
    "app.modules.atencion.models",
    "app.modules.reservas.models",
    "app.modules.pagos.models",
]
for nombre in MODULOS_CON_MODELOS:
    import_module(nombre)

config = context.config
config.set_main_option("sqlalchemy.url", get_settings().database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    conectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with conectable.connect() as conexion:
        context.configure(connection=conexion, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
