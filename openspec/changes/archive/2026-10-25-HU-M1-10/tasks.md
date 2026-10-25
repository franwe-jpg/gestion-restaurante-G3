# Tareas: HU-M1-10 Crear una sección de la carta

## Review Workload Forecast

| Campo | Valor |
| --- | --- |
| Líneas cambiadas estimadas | Backend ≈ 720 (código ≈ 420, pruebas ≈ 300); frontend ≈ 700 |
| Punto de control backend (800) | Dentro |
| Punto de control frontend (800) | Dentro |
| Riesgo de presupuesto | Bajo |
| PR encadenados recomendados | No (AGENTS.md §4: un solo PR por HU, nunca se divide) |
| División sugerida | PR único; las unidades de abajo son commits |
| Estrategia de entrega | single-pr |
| Estrategia de cadena | no aplica |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: none
800-line budget risk: Low

### Unidades de trabajo sugeridas

| Unidad | Objetivo | Commit | Prueba enfocada | Harness | Reversión |
| --- | --- | --- | --- | --- | --- |
| 1 | Modelos, migración y paginación (≈ 250 backend) | Commit 1 | `pytest tests/modules/productos/test_migracion.py tests/test_paginacion.py` | `alembic upgrade head && alembic downgrade -1` | `shared/models/`, `paginacion.py`, migración, `conftest.py` |
| 2 | Service, repository, router y wiring (≈ 470 backend) | Commit 2 | `pytest tests/modules/productos` | `GET /api/v1/secciones` con `TestClient` | `productos/*.py` y `main.py` |
| 3 | Frontend de secciones (≈ 700) | Commit 3 | `npm test -- productos` | Alta con traslado en `ProductosPage` | `frontend/src/modules/productos/*` y `Pagina<T>` |

Las tres unidades van en un solo PR; cada commit deja la CI en verde.

## Fase 1: Preparación y avisos

- [x] 1.1 Anotar en el PR los archivos compartidos: `backend/app/main.py`, `backend/app/shared/models/`, `backend/app/shared/paginacion.py`, `backend/tests/conftest.py`, la migración de Alembic y `frontend/src/shared/types/index.ts`. Avisar a M2, M3, M4 y M6 (AGENTS.md §9.3). No crear issues ni comentarios.
- [x] 1.2 Planificar commits por unidad de trabajo, con la prueba junto al código.

## Fase 2: Backend, base de datos y paginación

- [x] 2.1 RED: `backend/tests/modules/productos/test_migracion.py` (`upgrade head` crea `secciones` y `productos`; `downgrade -1` las elimina) y `backend/tests/conftest.py` (fixtures `db` y `cliente`).
- [x] 2.2 GREEN: `shared/models/{__init__,enums,producto}.py` (`Estado`, `Categoria`, `Producto`) y `modules/productos/models.py` (`Seccion`, `nombre_normalizado`, `@validates`, índice parcial A2).
- [x] 2.3 GREEN: migración `<rev>_crea_secciones_y_productos.py` (`down_revision = "efdafc2a164c"`); verificar que `alembic/env.py` no cambia.
- [x] 2.4 RED y GREEN: `backend/tests/shared/test_paginacion.py` y `shared/paginacion.py` (`ParametrosPaginacion`, `Pagina[T]`, `contar`, `aplicar`; `limit=101` → 422).

## Fase 3: Backend, lógica de negocio

- [x] 3.1 RED: `tests/modules/productos/conftest.py` (fábricas) y `test_service.py` para los CA 1, 3 (casefold y deshabilitada), 6 (ocupada y deshabilitada libre), 7 (404, 409 y selección) y 8 (409 sin confirmar, traslado atómico, falla a mitad del alta).
- [x] 3.2 GREEN: `schemas.py` (`SeccionCrear` estricto, salidas, ids repetidos → 422) y `repository.py` (sin `commit`).
- [x] 3.3 GREEN: `service.py` con auxiliares por paso, un solo `commit` y `IntegrityError` → `ReglaDeNegocioError`; funciones ≤ 50 líneas y complejidad ≤ 10.
- [x] 3.4 RED: `test_router.py` para 201 y forma S5, 422 de los CA 2, 4 y 5 (`"3"`, `2.0`, `true`, `0`, `-1`, 51 caracteres), listados paginados y `GET /productos` solo con habilitados.
- [x] 3.5 GREEN: `router.py` y `include_router` con `API_PREFIX` en `main.py`.

## Fase 4: Frontend

- [x] 4.1 Reescribir `types.ts` y `api.ts` (sin los tipos falsos) y agregar `Pagina<T>` en `frontend/src/shared/types/index.ts`; prueba de `api.ts` primero.
- [x] 4.2 RED y GREEN: `validarSeccion.test.ts` y `validarSeccion.ts` (CA 2, 4, 5; mensajes en español).
- [x] 4.3 RED y GREEN: `SeccionesTabla` (Orden, Nombre, cantidad, Estado con `Badge`) y `SelectorProductos` (sección actual; vacío sin productos).
- [x] 4.4 RED y GREEN: `SeccionFormDialog` (campos vacíos sin envío; 409 de nombre y orden; confirmación con `useConfirm` antes del envío único con `confirmar_traslado: true`; cancelar conserva datos).
- [x] 4.5 GREEN: `SeccionesTab` y pestañas «Productos» y «Secciones» en `ProductosPage.tsx`.

## Fase 5: Verificación final

- [x] 5.1 Backend desde `backend/`: `ruff check . && ruff format --check . && lint-imports && pytest` (cobertura ≥ 70 %).
- [x] 5.2 Frontend desde `frontend/`: `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` (cobertura ≥ 60 %).
- [x] 5.3 Medir líneas por lado (800 backend, 800 frontend) y registrar supuestos S1 a S6 y la pregunta A7 en el PR.
