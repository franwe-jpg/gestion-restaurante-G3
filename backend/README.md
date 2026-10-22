# Backend · Sistema de Gestión de Restaurante

API REST con FastAPI y SQLite. La arquitectura está en `SPRINT-0/S0-05-arquitectura.md` y las reglas de estilo en `SPRINT-1/S1-03-estandares-backend.md`.

Todos los comandos se ejecutan desde la carpeta `backend/`. Requiere Python 3.12 o más nuevo.

## Instalar

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

## Levantar

```bash
alembic upgrade head              # crea la base de datos (restaurante.db)
uvicorn app.main:app --reload     # arranca la API en http://127.0.0.1:8000
```

Para comprobar que funciona: abrir http://127.0.0.1:8000/api/v1/salud (responde `{"estado": "ok"}`). La documentación interactiva está en http://127.0.0.1:8000/docs.

## Lint y formato

```bash
ruff check .
ruff format --check .
lint-imports
```

`lint-imports` verifica las reglas de dependencia entre capas y módulos definidas en `pyproject.toml` (D-04): un módulo solo puede importar el `service` de otro.

Para corregir automáticamente: `ruff check --fix .` y `ruff format .`.

## Pruebas y cobertura

```bash
pytest
```

Corre las pruebas con el reporte de cobertura y falla si baja del 70 % (RNF-MAN-04).

## Migraciones

```bash
alembic revision --autogenerate -m "descripcion del cambio"   # crea la migracion
alembic upgrade head                                          # la aplica
```

El esquema de la base solo cambia con migraciones (RNF-MAN-06). Los modelos de cada módulo se registran en `alembic/env.py`.

## Configuración

Las variables están en `.env.example`. El `.env` real no se sube al repositorio.

| Variable | Para qué sirve | Valor por defecto |
| --- | --- | --- |
| `DATABASE_URL` | Ubicación de la base SQLite | `sqlite:///./restaurante.db` |
| `CORS_ORIGIN` | Único origen del frontend que puede usar la API | `http://localhost:5173` |
