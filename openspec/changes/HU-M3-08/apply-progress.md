# Progreso de apply: HU-M3-08 (listar las mesas)

- **Lotes:** Fase 1 (backend) y Fase 2 (frontend) en línea, más el cierre documental. Modo Strict TDD, `pytest` y Vitest.
- **Rama:** `feature/HU-M3-08-listar-mesas`, apilada sobre `feature/HU-M3-03-eliminar-sector`.
- **Entorno:** Node 22.23.4; Python 3.12 con la `.venv` del backend.

## Tareas completadas

| Fase | Tareas | Commit |
| --- | --- | --- |
| 0. Artefactos de SDD | exploración, propuesta, spec, diseño y tareas | `docs(HU-M3-08)` de este cambio |
| 1. Listado en el backend | 1.1 a 1.6 | `feat(HU-M3-08)` del backend |
| 2. Pestañas y tabla en el frontend | 2.1 a 2.5 | `feat(HU-M3-08)` del frontend |
| 3. Cierre y verificación | 3.1 a 3.3 | commit `docs:` de este informe |

## Evidencia TDD

| Fase | Rojo | Verde |
| --- | --- | --- |
| 1 | 9 fallas: `service` sin `listar_mesas` y `POST`/`GET` inexistentes (las 5 de router respondían 404 o 405) | 168 pruebas del módulo `salon` pasan |
| 2 | `api.ts` sin `listarMesas` (el módulo no resolvía y cayeron 83 pruebas del módulo), `useMesasDelSalon` y `MesasTabla` inexistentes y `SalonPage` sin pestañas | 126 pruebas de `salon` pasan |

## Resultado de la CI

- Backend (desde `backend/`): `ruff check .`, `ruff format --check .` y `lint-imports` (10 contratos cumplidos, 0 rotos) en verde; `pytest`: `639 passed`, cobertura 99,56 % (umbral 70 %). Sin migración nueva.
- Frontend (desde `frontend/`): `npm run lint` (0 errores, 0 advertencias), `format:check`, `typecheck`, `test:coverage` (45 archivos y 490 pruebas; cobertura global 76,68 % de líneas, umbral 60 %) y `build` en verde.

## Desviaciones y notas

- `GET /api/v1/mesas` usa un `join` explícito de `Mesa` con `Sector`; no se agregó `relationship` al modelo ni cambió el esquema.
- `/salon` se organizó con `Tabs`. «Sectores» queda activa por defecto para no cambiar el punto de entrada de HU-M3-04; la maqueta abre en «Mesas». Se anota en el PR.
- Al crear una mesa, la pantalla activa la pestaña «Mesas» e incrementa `refrescoMesas`, que forma parte de la clave de `useApi`. El listado se vuelve a pedir sin estado duplicado.
- Se extrajo `SeccionListado` (tarjeta + paginación) para no duplicar el layout entre sectores y mesas, y el estado de pestañas se movió a `useDialogosDelSalon` para respetar `max-lines-per-function` (50).
- No se agregaron los filtros por sector ni estado de la maqueta ni la columna «Mesas» de la pestaña de sectores: no están en los criterios de #41.
- Sin dependencias nuevas y sin cambios en `backend/app/shared/`, `models.py`, `schemas.py` ni `frontend/src/shared/`.
- Rama apilada sobre HU-M3-03/HU-M3-02-04; el PR depende de esa cadena.
