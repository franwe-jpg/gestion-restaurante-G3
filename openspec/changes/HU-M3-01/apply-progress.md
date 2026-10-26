# Progreso de apply: HU-M3-01

- **Lote único:** Fases 1 a 3 (backend, frontend y cierre). Modo Strict TDD, `pytest` y Vitest.
- **Rama:** `feature/HU-M3-01-agregar-sector`

## Tareas completadas

| Fase | Tareas | Commit |
| --- | --- | --- |
| 1. Entidad `Sector` y migración | 1.1 a 1.4 | `3017e62` |
| 2. Alta de sectores (`POST /sectores`) | 1.5 a 1.9 | `e911ae4` |
| 3. Frontend del alta | 2.1 a 2.6 | `0262163` |
| 4. Cierre y artefactos | 3.1 a 3.3 | commit `docs:` de este informe |

## Evidencia TDD

| Fase | Rojo | Verde |
| --- | --- | --- |
| 1 | `test_migracion.py`: 4 fallas, `no such table: sectores` | 5 pruebas pasan |
| 2 | `test_schemas.py`: `ImportError: cannot import name 'SectorCrear'`; `test_service.py` y `test_router.py`: 17 fallas por `service.crear_sector` ausente y ruta inexistente | 39 pruebas del módulo pasan |
| 3 | `validarSector`, `useFormularioSector`, `SectorFormDialog`, `SalonPage` y `api`: importaciones sin resolver o botón ausente | 25 pruebas del módulo pasan |

## Resultado de la CI

- Backend (desde `backend/`): `ruff check .`, `ruff format --check .` y `lint-imports` (10 contratos cumplidos) en verde; `pytest`: `390 passed`, cobertura 99,39 % (umbral 70 %). `alembic heads`: una sola cabeza (`f3a5c7e9b1d2`).
- Frontend (desde `frontend/`): `npm run lint` (0 errores, 0 advertencias), `format:check`, `typecheck`, `test:coverage` (cobertura global 76,48 % de líneas, umbral 60 %) y `build` en verde. El módulo de salón aporta 25 pruebas.

## Desviaciones y notas

- La revisión de Alembic es `f3a5c7e9b1d2_crea_sectores.py`, con `down_revision = "c4e6a8b0d2f4"`.
- Se ajustó `backend/tests/modules/productos/test_migracion.py`: la prueba de downgrade baja a `REVISION_PREVIA` (`a1c3e5f7b9d1`) en lugar de `-1`, porque la cabeza ahora es la migración de sectores. No cambia el comportamiento de productos.
- Se quitaron de `frontend/src/modules/salon/api.ts` las funciones provisorias `listarMesas` y `listarMozos`: llamaban a rutas inexistentes. Sus contratos reales llegan con HU-M3-05 y HU-M3-08. Los tipos `Mesa` y `Mozo` se conservan.
- Archivo compartido tocado: `backend/app/main.py` (registro del router del salón).
- Sin dependencias nuevas.
