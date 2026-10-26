# Progreso de apply: HU-M1-05-06

- **Lote único:** Fases 1 a 4 (backend, frontend y cierre). Modo Strict TDD, `pytest` y Vitest.
- **Rama:** `feature/HU-M1-05-06-modificar-baja-postre`

## Tareas completadas

| Fase | Tareas | Commit |
| --- | --- | --- |
| 1. Backend: consultar, modificar y dar de baja un postre | 1.1 a 1.7 | `da05568` |
| 2. Frontend: configuración de edición y ruta de la pantalla | 2.1 a 2.9 | `06002e6` |
| 3. Frontend: acciones en la fila de un postre | 3.1 a 3.5 | `958d726` |
| 4. Cierre | 4.1 a 4.5 | commit `docs:` de los artefactos |

## Evidencia TDD

| Fase | Rojo | Verde |
| --- | --- | --- |
| 1 | `test_schemas.py` falla en la importación (`PostreModificar` ausente); 15 fallas en `test_router.py` (404 o 405 de las rutas de postres). Pasaron desde el inicio los 404 de postre inexistente y de id de plato en `GET`, `PUT` y baja (la ruta no existía). | 351 pruebas pasan, cobertura 99,30 % |
| 2 | 5 fallas en `categorias.test.ts` (función y clave ausentes), 6 en `ProductoEditarPage.test.tsx` (postres) y 1 en `App.test.tsx` (ruta ausente). Las de `api.test.ts` no fallan en Vitest (no verifica tipos); `npm run typecheck` las marcaba hasta ampliar `CategoriaEdicion`. | 263 pruebas pasan |
| 3 | 4 fallas en `AccionesProducto.test.tsx` (enlace fijo a `/platos` y postres sin acciones) | 263 pruebas pasan, sin tocar `ProductosTabla.test.tsx` ni `ProductosTab.test.tsx` |

## Resultado de la CI (Fase 4)

- Backend (desde `backend/`): `ruff check .`, `ruff format --check .` y `lint-imports` (10 contratos cumplidos) en verde; `pytest`: `351 passed`, cobertura 99,30 % (umbral 70 %). `alembic heads`: una sola cabeza (`c4e6a8b0d2f4`), sin migración nueva.
- Frontend (desde `frontend/`): `npm run lint` (0 errores, 0 advertencias), `format:check`, `typecheck`, `test:coverage` (`27` archivos, `263` pruebas; cobertura de sentencias 72,38 %, umbral 60 %) y `build` en verde.

## Desviaciones y notas

- El bloque de pruebas de postres de `ProductoEditarPage.test.tsx` se dividió en dos `describe` para cumplir `max-lines-per-function` (50) en el archivo de pruebas.
- `api.test.ts`: el bloque de edición y baja pasó a `describe.each` (plato y postre); `urlDeImagen` quedó en su propio `describe`.
- `AccionesProducto.test.tsx`: la ruta simulada de edición usa `:segmento` para servir a las dos categorías.
- Sin cambios en `service`, `repository`, `models`, `shared/` ni migraciones. Código compartido tocado: solo `frontend/src/App.tsx` (una ruta).
