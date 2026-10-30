# Tareas: HU-M1-04 Crear un postre

- **Issue:** #6 · **Rama:** `feature/HU-M1-04-crear-postre` (apilada sobre HU-M1-01, PR #177) · **Entrada:** `proposal.md`, `specs/carta-productos/spec.md`, `design.md` (C1 a C8).
- Strict TDD: la prueba falla primero (404 o texto ausente) y recién después se escribe el código. En los renombrados puros (C8), la «prueba» es que la suite existente siga verde.
- Una unidad de trabajo = un commit (Conventional Commits, en español, con `(HU-M1-04)`). Un solo PR, sin PR encadenados.
- Orden: secuencial, salvo lo marcado como paralelizable.

## Pronóstico de carga de revisión

| Campo | Valor |
| --- | --- |
| Backend (cambios estimados) | ≈ 125 líneas (≈ 15 de código, ≈ 110 de pruebas) |
| Frontend (cambios estimados) | ≈ 300 líneas (≈ 130 de código, ≈ 170 de pruebas; los renombrados cuentan solo las líneas cambiadas) |
| 800-line budget risk: | Low |
| Chained PRs recommended: | No |
| Decision needed before apply: | No |
| Chain strategy: | none |
| Estrategia de entrega | `single-pr`: un PR hacia `develop` con 5 commits |

## Fase 1. Renombrado sin cambios de comportamiento (frontend)

- [x] **1.1** `git mv` de `pages/PlatoNuevoPage.tsx` a `pages/ProductoNuevoPage.tsx`, `components/useFormularioPlato.ts` a `components/useFormularioProducto.ts` y `components/validarPlato.ts` a `components/validarProducto.ts`, junto con sus archivos `*.test.ts(x)` (C8). Renombrar símbolos: `PlatoCrear` a `ProductoCrear` (`types.ts`), `NOMBRE_PRODUCTO_MAXIMO`, `DatosFormularioProducto`, `ErroresProducto`, `validarProducto`, `useFormularioProducto`, `ProductoNuevoPage` e `id` `plato-*` a `producto-*`. Corregir las importaciones (`App.tsx` incluido). Los textos visibles («Nuevo plato», «Guardar plato») y `crearPlato` no cambian. Satisface: requisito «El alta de platos no cambia».
- [x] **1.2** Verificar: `npm run lint && npm run typecheck && npm test` en `frontend/` en verde y `pytest` en `backend/` en verde; `git log --follow` conserva la historia de los archivos movidos.
- [x] **1.3** Commit 1 (solo renombrado): `chore: renombra el alta de platos a alta de productos (HU-M1-04)`. Rollback: revertir el commit.

## Fase 2. Backend: `POST /api/v1/postres` (puede hacerse en paralelo con la Fase 3 y la 4 solo después de la 1)

- [x] **2.1** (Rojo) En `backend/tests/modules/productos/test_router.py`: `fixture` `alta` parametrizada (`plato`, `postre`) con ruta, categoría y mensaje del 409; renombrar `test_crear_plato_*` a `test_crear_producto_*` y adaptar `_crear(cliente, alta, datos, ...)` (C2). Cubre CA 1 a 14, estado asignado por el sistema y atomicidad para las dos categorías. Los casos de `postre` fallan con 404.
- [x] **2.2** (Rojo) Pruebas nuevas solo de postre: S14 (plato «Flan» y postre «Flan» conviven con 201; crear otro plato «Flan» da 409 «El plato ya está registrado»), el 409 del postre dice «El postre ya está registrado» (S13) y postre sin ingredientes da 422 (CA 6).
- [x] **2.3** (Rojo) En `test_schemas.py`: parametrizar la prueba de `PlatoCrear` para `PostreCrear` (categoría `POSTRE`, mensaje S13, `ingredientes` con `min_length=1`, `categoria` y `estado` desconocidos dan 422).
- [x] **2.4** (Verde) En `schemas.py`: `PostreCrear(ProductoCrear)` con `CATEGORIA`, `MENSAJE_NOMBRE_REPETIDO` e `ingredientes` obligatorios. En `router.py`: función explícita `crear_postre` con `POST /postres`, igual a `crear_plato` (C1). Sin cambios en `service`, `repository`, `models` ni migraciones.
- [x] **2.5** Verificar desde `backend/`: `ruff check --fix . && ruff format .` y luego `ruff check . && ruff format --check . && lint-imports && pytest` (cobertura ≥ 70 %).
- [x] **2.6** Commit 2: `feat: permite crear un postre con POST /postres (HU-M1-04)`. Rollback: revertir el commit; no hay cambios de esquema.

## Fase 3. Frontend: configuración por categoría y capa de datos (depende de la Fase 1; paralelizable con la Fase 2)

- [x] **3.1** (Rojo) `validarProducto.test.ts`: casos actuales con `validarProducto(datos, { ingredientesObligatorios })`; ingredientes opcionales con `ingredientesObligatorios: false`; `errorDelServidor(mensaje, configuracion)` con el texto de cada configuración. Prueba de `api.ts` con `it.each`: `crearProducto('PLATO' | 'POSTRE', ...)` envía una sola solicitud multipart a `/platos` o `/postres`.
- [x] **3.2** (Verde) Crear `productos/categorias.ts` (`CategoriaAlta`, `ConfiguracionAlta`, `CONFIGURACIONES` con los textos completos de plato y postre, C3). `api.ts`: `ENDPOINTS_ALTA` y `crearProducto(categoria, datos, imagen)` en lugar de `crearPlato` (C4). Adaptar `validarProducto` y `errorDelServidor` a la configuración.
- [x] **3.3** (Rojo, luego verde) `useFormularioProducto`: pruebas con `describe.each` sobre `PLATO` y `POSTRE` (llamada a `crearProducto` con la categoría, 409 con el texto de cada categoría, CA 2 y CA 8, `vi.mock('../api')`). Parametrizar el `hook` con `{ categoria, onCreado }`.
- [x] **3.4** Verificar desde `frontend/`: `npm run format` y luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`.
- [x] **3.5** Commit 3: `feat: parametriza el alta de productos por categoría (HU-M1-04)`. Rollback: revertir el commit (deja el commit 1 intacto).

## Fase 4. Frontend: pantalla, rutas y botón «Nuevo postre» (depende de la Fase 3)

- [x] **4.1** (Rojo) `ProductoNuevoPage.test.tsx` con `describe.each(['PLATO', 'POSTRE'])`: título y migas, botón de envío, campo «Estado» fijo, selector solo con secciones habilitadas, aviso sin secciones (CA 8), chips de ingredientes y etiquetas, imagen (CA 10 a 12), alta exitosa con aviso y regreso a «Productos». Para `POSTRE`: «Nuevo postre», «Guardar postre», ingredientes obligatorios y 409 «El postre ya está registrado». Para `PLATO`: «Nuevo plato», «Guardar plato» y regresión intacta.
- [x] **4.2** (Rojo) `App.test.tsx` con `it.each` sobre rutas: `/productos/platos/nuevo` y `/productos/postres/nuevo` muestran el formulario correspondiente; `/productos/nuevo` redirige a `/productos/platos/nuevo`. `ProductosPage.test.tsx`: existen «Nuevo plato» y «Nuevo postre» y este último abre `/productos/postres/nuevo`.
- [x] **4.3** (Verde) `ProductoNuevoPage` recibe `{ categoria: CategoriaAlta }` y usa `CONFIGURACIONES` (C3). `App.tsx`: rutas `productos/platos/nuevo` y `productos/postres/nuevo` con `lazy` (C5) y `<Navigate to="/productos/platos/nuevo" replace />` en `productos/nuevo` (C6). `ProductosPage`: botón «Nuevo postre» junto a «Nuevo plato» (C7). **Archivo compartido: `App.tsx`, avisar (§9.3).**
- [x] **4.4** Verificar desde `frontend/`: `npm run format` y luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` (cobertura ≥ 60 %).
- [x] **4.5** Commit 4: `feat: agrega la pantalla Nuevo postre (HU-M1-04)`. Rollback: revertir el commit; la alta de platos sigue por la ruta nueva.

## Fase 5. Cierre

- [x] **5.1** Backend desde `backend/`: `ruff check . && ruff format --check . && lint-imports && pytest` en verde, cobertura ≥ 70 %. Frontend desde `frontend/`: `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` en verde, cobertura ≥ 60 % (AGENTS.md §7).
- [x] **5.2** `alembic heads` desde `backend/` muestra una sola cabeza y no cambió respecto de HU-M1-01 (sin migración nueva).
- [x] **5.3** Comprobar que cada criterio de aceptación CA 1 a 14 y los requisitos «Estado asignado por el sistema», «Atomicidad» y «El alta de platos no cambia» tienen una prueba que pasa.
- [x] **5.4** Redactar las notas del PR (plantilla `.github/pull_request_template.md`, `Closes #6`, hacia `develop`):
  - Supuestos S13 y S14 a validar por el equipo.
  - Aviso del cambio en `frontend/src/App.tsx`, archivo compartido (§9.3).
  - Diferencia con la maqueta: botón «Nuevo postre» que la maqueta no muestra (C7).
  - Rama apilada sobre el PR #177 (HU-M1-01): HU-M1-01 debe archivarse antes que HU-M1-04; rebasar sobre `develop` cuando se integre.
- [x] **5.5** Commit 5 solo si hay artefactos de SDD por versionar: `docs: agrega los artefactos de SDD de HU-M1-04 (HU-M1-04)`.

## Trazabilidad

| Requisito de la spec | Tareas |
| --- | --- |
| CA 1 a 14, estado, atomicidad (API) | 2.1 a 2.4 |
| CA 1 a 14, estado (formulario) | 3.1 a 3.3, 4.1, 4.3 |
| Nombre único por categoría (S13, S14) | 2.2, 3.1 |
| Botón, rutas y redirección | 4.2, 4.3 |
| El alta de platos no cambia | 1.1, 1.2, 4.1 |
