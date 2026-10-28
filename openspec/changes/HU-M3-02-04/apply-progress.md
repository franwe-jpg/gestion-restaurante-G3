# Progreso de apply: HU-M3-02 y HU-M3-04

- **Lotes:** Fase 1 (backend) y Fase 2 (frontend) en paralelo, más el cierre documental. Modo Strict TDD, `pytest` y Vitest.
- **Rama:** `feature/HU-M3-02-04-modificar-listar-sector`, desde `develop` en `0bff1e0`.
- **Entorno:** Node 22.23.4 vía nvm (el proyecto exige `>=22.12.0`; la máquina tenía Node 18.19.1).

## Tareas completadas

| Fase | Tareas | Commit |
| --- | --- | --- |
| 0. Artefactos de SDD | exploración, propuesta, spec, diseño y tareas | `a4416b0` |
| 1. Modificación en el backend | 1.1 a 1.7 | `ac3bae7` |
| 2. Listado y edición en el frontend | 2.1 a 2.8 | `7efc40d` |
| 3. Cierre y verificación | 3.1 a 3.3 | commit `docs:` de este informe |

## Evidencia TDD

| Fase | Rojo | Verde |
| --- | --- | --- |
| 1 | `test_schemas.py`: `ImportError: cannot import name 'SectorModificar'`; `test_service.py`: 10 fallas por `existe_nombre_normalizado() got an unexpected keyword argument 'excluir_id'` y `module 'app.modules.salon.service' has no attribute 'modificar_sector'`; `test_router.py`: 14 fallas con 404 porque la ruta `PUT` no existía | 50 pruebas de esquemas, 25 de servicio y 53 de router; 147 pruebas del módulo pasan |
| 2 | `api.test.ts`: 3 fallas por `modificarSector`/`listarSectores` inexistentes; `useFormularioSector.test.tsx`: 7 fallas (`onCreado` no es función y campos sin precargar); `SectorFormDialog.test.tsx`: 4 fallas por título, botón y estado de edición; `SectoresTabla.test.tsx` y `useSectoresDelSalon.test.tsx`: la suite no resuelve el módulo; `SalonPage.test.tsx`: 11 fallas por el aviso de HU-M3-04 | 113 pruebas de `salon` y `shared/api` pasan |

## Resultado de la CI

- Backend (desde `backend/`): `ruff check .`, `ruff format --check .` y `lint-imports` (10 contratos cumplidos, 0 rotos) en verde; `pytest`: `618 passed`, cobertura 99,55 % (umbral 70 %). Sin migración nueva: `alembic heads` sigue con una sola cabeza.
- Frontend (desde `frontend/` con Node 22): `npm run lint` (0 errores, 0 advertencias), `format:check`, `typecheck`, `test:coverage` (42 archivos y 464 pruebas; cobertura global 76,68 % de líneas, umbral 60 %) y `build` en verde.
- Diferencial: la copia de `HEAD` antes del cambio en `/tmp/opencode` corrió las 110 pruebas preexistentes del módulo (`110 passed`) y el árbol modificado las deja en verde, sin cambios de comportamiento.

## Desviaciones y notas

- La tarea 2.1 quedó como verificación: `clienteHttp.put` ya existía desde HU-M1-02 con sus pruebas, así que el cliente compartido no cambió. `design.md` decía agregarlo; se corrige en la nota del PR, no en el código.
- La tarea 1.5 falló como 404 y no 405: FastAPI responde 404 cuando la ruta no tiene ningún handler para ese método.
- `SalonPage` se dividió en `AccionesDelSalon`, `SeccionSectores` y `DialogosSalon` para respetar `max-lines-per-function` (50); la lectura quedó en `useSectoresDelSalon`.
- El diálogo de edición conserva la leyenda «El estado del sector lo asigna el sistema.» y agrega la línea «Estado: Habilitado/Deshabilitado» con el valor real del sector.
- Punto de control de revisión: backend 427 líneas y frontend 932 líneas. El frontend supera las 800 y se integra igual en un solo PR (AGENTS.md §4: es un punto de control, no un bloqueo).
- Sin dependencias nuevas y sin cambios en `backend/app/shared/`, `main.py`, `App.tsx` ni `models.py`.
- Ajuste posterior del 28/10: la columna Nombre del listado se muestra en mayúsculas por pedido de la responsable del módulo. Es presentación pura (`span` con clase `uppercase`); el dato guardado, el precargado en el diálogo y el `aria-label` conservan el nombre original. Se agregó el escenario correspondiente a la spec y la decisión M17 al diseño.
- Evaluación de riesgo de RDD sobre el candidato: `medium`, `review_due=false`, motivo `under_budget` (25 rutas y 2037 líneas acumuladas desde `0bff1e0`).
