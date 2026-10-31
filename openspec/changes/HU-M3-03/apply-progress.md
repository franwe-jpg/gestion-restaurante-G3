# Progreso de apply: HU-M3-03 (eliminar un sector)

- **Lotes:** Fase 1 (backend) y Fase 2 (frontend) en línea, más el cierre documental. Modo Strict TDD, `pytest` y Vitest.
- **Rama:** `feature/HU-M3-03-eliminar-sector`, apilada sobre `feature/HU-M3-02-04-modificar-listar-sector` (`c59eef1`).
- **Entorno:** Node 22.23.4; Python 3.12 con la `.venv` del backend.

## Tareas completadas

| Fase | Tareas | Commit |
| --- | --- | --- |
| 0. Artefactos de SDD | exploración, propuesta, spec, diseño y tareas | `docs(HU-M3-03)` de este cambio |
| 1. Baja en el backend | 1.1 a 1.7 | `feat(HU-M3-03)` del backend |
| 2. Baja en el frontend | 2.1 a 2.5 | `feat(HU-M3-03)` del frontend |
| 3. Cierre y verificación | 3.1 a 3.3 | commit `docs:` de este informe |

## Evidencia TDD

| Fase | Rojo | Verde |
| --- | --- | --- |
| 1 | `test_service.py`: 7 fallas (`module 'app.modules.salon.service' has no attribute 'dar_de_baja_sector'` y `repository` sin `contar_mesas_del_sector`); `test_router.py`: 5 fallas con 404 porque la ruta `POST /sectores/{id}/baja` no existía | 159 pruebas del módulo `salon` pasan |
| 2 | `api.test.ts`: `eliminarSector` no existe; `useBajaSector.test.tsx`: el módulo no existe; `SectoresTabla.test.tsx` y `SalonPage.test.tsx`: 5 fallas porque la acción «Eliminar «nombre»» no estaba en la tabla | 110 pruebas de `salon` pasan |

## Resultado de la CI

- Backend (desde `backend/`): `ruff check .`, `ruff format --check .` y `lint-imports` (10 contratos cumplidos, 0 rotos) en verde; `pytest`: `630 passed`, cobertura 99,56 % (umbral 70 %). Sin migración nueva.
- Frontend (desde `frontend/`): `npm run lint` (0 errores, 0 advertencias), `format:check`, `typecheck`, `test:coverage` (cobertura global 76,68 % de líneas, umbral 60 %) y `build` en verde.

## Desviaciones y notas

- La baja es lógica: `POST /api/v1/sectores/{id}/baja` (D-24) pasa `estado` a `DESHABILITADO`; no se borran filas y las mesas se conservan.
- `SalonPage` superó las 50 líneas al sumar la baja. Se extrajo `useDialogosDelSalon` dentro del mismo archivo para volver al límite de RNF-MAN-05; no cambia el comportamiento.
- La acción «Eliminar» solo se muestra en sectores habilitados; la edición sigue disponible para los deshabilitados.
- `Supuesto:` S1 confirmado por la persona responsable antes del apply: la reactivación queda fuera de este cambio.
- Sin dependencias nuevas y sin cambios en `backend/app/shared/`, `models.py`, `schemas.py` ni `frontend/src/shared/`.
- Rama apilada: `develop` todavía no tiene `SectoresTabla` (HU-M3-02-04 está sin integrar).
