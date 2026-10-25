# Apply progress: HU-M1-10 (Strict TDD)

Tareas completas: 16 de 19. Pendientes: 1.1 y 5.3 (parte de registrar avisos y supuestos en el PR) y 1.2 (planificar commits), que son del orquestador.

## TDD Cycle Evidence

| Tarea | Archivo de prueba | Capa | RED | GREEN | Triangulación | Refactor |
| --- | --- | --- | --- | --- | --- | --- |
| 2.1-2.3 | `backend/tests/modules/productos/test_migracion.py`, `tests/conftest.py` | Integración | Falló `upgrade` (sin tablas) | 2 pasan; `alembic check` sin diferencias | upgrade y downgrade | Limpio |
| 2.4 | `backend/tests/shared/test_paginacion.py` | Unidad | Error de importación | 8 pasan | defecto, límites, recorte por páginas | Limpio |
| 3.1-3.3 | `backend/tests/modules/productos/test_service.py` | Unidad | Error de importación | 15 pasan | casefold ASCII y Ñ, habilitada y deshabilitada, carrera | Auxiliares por paso |
| 3.4-3.5 | `backend/tests/modules/productos/test_router.py` | Integración | 22 fallan | 23 pasan | parametrizados de CA 2, 4, 5 | Limpio |
| 4.1 | `frontend/src/modules/productos/api.test.ts` | Unidad | Fallaba (sin funciones) | 3 pasan | 3 funciones | n/a |
| 4.2 | `components/validarSeccion.test.ts` | Unidad | Error de importación | 12 pasan | 5 órdenes inválidos, borde de 50 y 51 | Limpio |
| 4.3 | `SeccionesTabla.test.tsx`, `SelectorProductos.test.tsx` | Componente | Error de importación | 6 pasan | con datos, vacío, error | Limpio |
| 4.4 | `SeccionFormDialog.test.tsx` | Componente | Error de importación | 8 pasan | CA 2, 3, 4, 5, 6, 8 (confirmar y cancelar) | Lógica en `useFormularioSeccion.ts` |
| 4.5 | `SeccionesTab.test.tsx`, `pages/ProductosPage.test.tsx` | Componente | Error de importación | 6 pasan | listado, error, alta, cancelar, pestañas | Limpio |

## Resultados de CI (final)

- Backend: `ruff check .` OK; `ruff format --check .` OK; `lint-imports` 10 contratos cumplidos; `pytest` 57 pasan, cobertura 98.93 % (umbral 70 %).
- Frontend: `npm run lint` OK; `format:check` OK; `typecheck` OK; `test:coverage` 58 pasan, sentencias 70.88 %, ramas 67.81 %, funciones 67.08 %, líneas 73.43 % (umbral 60 %); `build` OK.

## Líneas cambiadas

- Backend: ≈ 1003 agregadas (código ≈ 465 con migración de 69; pruebas ≈ 541). Supera el punto de control de 800 (pronóstico ≈ 720).
- Frontend: ≈ 892 agregadas, 24 borradas (código ≈ 454; pruebas ≈ 462). Supera el punto de control de 800 (pronóstico ≈ 700).

## Desviaciones del diseño

- `repository.obtener_nombre_de_seccion` agregado (el 409 de traslado necesita el nombre de la sección actual).
- `useFormularioSeccion.ts` extraído del diálogo para cumplir 50 líneas por función.
- `SeccionFormDialog` no recibe `open`: el padre lo monta solo mientras está abierto (campos vacíos en cada apertura).
- Las pruebas del diálogo se dividen en tres `describe` por el límite de 50 líneas por función que ESLint aplica también a las pruebas.
