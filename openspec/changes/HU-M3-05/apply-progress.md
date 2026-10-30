# Progreso de apply: HU-M3-05

- **Lote único:** Fases 1 a 3 (backend, frontend y cierre). Modo Strict TDD, `pytest` y Vitest.
- **Rama:** `feature/HU-M3-05-crear-mesa`, apilada sobre `feature/HU-M3-01-agregar-sector`.

## Tareas completadas

| Fase | Tareas | Commit |
| --- | --- | --- |
| 1. `EstadoMesa`, entidad `Mesa` y migración | 1.1 a 1.4 | `688f34f` |
| 2. Alta de mesas y `GET /sectores` | 1.5 a 1.11 | `a70ccd2` |
| 3. Frontend del alta de mesa | 2.1 a 2.6 | `e1adc83` |
| 4. Cierre y artefactos | 3.1 a 3.3 | commit `docs:` de este informe |

## Evidencia TDD

| Fase | Rojo | Verde |
| --- | --- | --- |
| 1 | `test_modelo.py`: `ImportError: cannot import name 'Mesa'`; `test_migracion.py`: 5 fallas con `no such table: mesas` | 19 pruebas de modelo y migración pasan |
| 2 | `test_schemas.py`: importación de `MesaCrear`/`MesaSalida`/`SectorResumen` inexistentes; `test_service.py`: 8 fallas por `crear_mesa`/`listar_sectores` ausentes; `test_router.py`: 26 fallas por rutas ausentes | 110 pruebas del módulo pasan |
| 3 | `validarMesa`, `useFormularioMesa`, `MesaFormDialog`, `crearMesa` y `listarSectoresHabilitados` sin resolver; 7 pruebas fallan | 67 pruebas del módulo pasan |

## Resultado de la CI

- Backend (desde `backend/`): `ruff check .`, `ruff format --check .` y `lint-imports` (10 contratos cumplidos) en verde; `pytest`: `461 passed`, cobertura 99,46 % (umbral 70 %). `alembic heads`: una sola cabeza (`b2d4f6a8c0e1`).
- Frontend (desde `frontend/`): `npm run lint` (0 errores, 0 advertencias), `format:check`, `typecheck`, `test:coverage` (cobertura global 76,48 % de líneas, umbral 60 %) y `build` en verde. El módulo de salón aporta 67 pruebas.

## Desviaciones y notas

- La revisión de Alembic es `b2d4f6a8c0e1_crea_mesas.py`, con `down_revision = "f3a5c7e9b1d2"`.
- `EstadoMesa` se agregó a `backend/app/shared/models/enums.py` y se re-exportó en `backend/app/shared/models/__init__.py`; es el archivo compartido principal de esta HU y se avisa a M4 y M5 en el PR.
- La prueba de downgrade de sectores se ajustó a `-2` porque la cabeza avanzó. Se agregó una prueba específica para `downgrade -1` de mesas.
- `GET /sectores` es la lectura de apoyo de HU-M3-04; no incluye la pantalla de listado.
- Punto de control de revisión: backend ≈ 857 líneas y frontend ≈ 850, apenas por encima de 800 por lado. La HU va en un solo PR (AGENTS.md §4); no se divide.
- Sin dependencias nuevas.
