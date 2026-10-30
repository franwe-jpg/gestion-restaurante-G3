# Apply progress: HU-M1-04 Crear un postre

Mode: Strict TDD. Status: 23/24 tasks done; 5.5 (commit of SDD artifacts) is left to the orchestrator. Nothing committed.

## TDD Cycle Evidence

| Task | Test file(s) | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- |
| 1.1-1.2 Rename (C8) | existing `*.test.ts(x)` moved with `git mv` | backend 180 passed, frontend 129 passed | Pure rename: the existing suite is the test | lint, typecheck, 129 frontend tests green | N/A (structural) | Symbols and DOM ids renamed |
| 2.1-2.2 Router | `test_router.py` (`alta` fixture plato/postre, 3 postre-only tests) | 180 passed | 34 failed (404 on `/postres`) | 222 passed after 2.4 | plato vs postre per criterion; S14 and S13 cases | `_crear(cliente, alta, ...)` |
| 2.3 Schemas | `test_schemas.py` | 180 passed | ImportError `PostreCrear` | 222 passed | plato/postre, ausentes/vacios, estado/categoria | None needed |
| 2.4 Impl | `schemas.py`, `router.py` | - | - | `PostreCrear`, `crear_postre` | - | ruff fixed import order |
| 3.1-3.3 Data layer and hook | `validarProducto.test.ts`, `api.test.ts`, `useFormularioProducto.test.tsx` | 129 passed | modules missing (`categorias`), type errors, 2 failing tests | 96 productos tests green | `it.each` and `describe.each` over PLATO/POSTRE, `ingredientesObligatorios` false | split describe for max-lines |
| 4.1 Page | `ProductoNuevoPage.test.tsx` (`describe.each`) | 129 passed | typecheck failure (no `categoria` prop) | green after 4.3 | per category: title, button, 409, CA 2, 6, 8, 11 | None needed |
| 4.2-4.3 Routes and button | `App.test.tsx`, `ProductosPage.test.tsx` | 129 passed | 5 failed | 159 passed | 3 routes, 2 buttons | None needed |

## Work Unit Evidence

| Evidence | Value |
| --- | --- |
| Focused test command | `pytest tests/modules/productos` and `npx vitest run src/modules/productos src/App.test.tsx`: green |
| Runtime harness | `TestClient` multipart against `/api/v1/postres`; `App` routing with `MemoryRouter` |
| Rollback boundary | Backend: `schemas.py`, `router.py` and their tests. Frontend: rename, `categorias.ts`, `api.ts`, page, `App.tsx`, `ProductosPage.tsx` |

## Final CI

- Backend: `ruff check .`, `ruff format --check .`, `lint-imports` (10 kept), `pytest` 222 passed, coverage 99.37 %. `alembic heads`: `c4e6a8b0d2f4` (single head).
- Frontend: `lint`, `format:check`, `typecheck`, `test:coverage` 159 passed (statements 71.11 %), `build` OK.

## Notes

- Shared file touched: `frontend/src/App.tsx` (+ test). Nothing else shared; no migration or dependency.
- The `ingredientesObligatorios: false` branch has tests but both categories use `true` today (spec).
