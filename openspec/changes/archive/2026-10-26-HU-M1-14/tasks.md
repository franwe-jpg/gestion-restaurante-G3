# Tareas: HU-M1-14 Ver la carta

- **Issue:** #19 (HU-M1-14) · **Rama:** `feature/HU-M1-14-ver-carta` · **Entrada:** `proposal.md` (S79 a S89), `specs/carta-vista/spec.md` (S90 a S95), `design.md` (I1 a I14, S96 a S99).
- Strict TDD: la prueba falla primero (404 de la ruta, función ausente, texto ausente) y recién después se escribe el código. Las extracciones (refactor) se hacen con las pruebas existentes en verde y sin cambiar el comportamiento.
- Una unidad de trabajo = un commit (Conventional Commits, en español, con `(HU-M1-14)`). Un solo PR hacia `develop`, sin PR encadenados.
- Orden: secuencial. La Fase 1 (backend) es independiente del frontend; la Fase 3 depende de la 2 y la 4 de la 3.
- Pruebas del backend en `backend/tests/modules/productos/` con nombres `test_<función>_<caso>`. Pruebas del frontend junto al archivo que prueban.

## Pronóstico de carga de revisión

| Campo | Valor |
| --- | --- |
| Backend (cambios estimados) | ≈ 350 líneas (≈ 90 de código, ≈ 260 de pruebas) |
| Frontend (cambios estimados) | ≈ 640 líneas (≈ 330 de código, ≈ 310 de pruebas) |
| Estimated changed lines | ≈ 990 en total; cada lado se mide contra su propio punto de control de 800 |
| 400-line budget risk | Low (ambos lados por debajo de 800) |
| Estrategia de entrega | `single-pr`: un PR con 5 commits |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: none
400-line budget risk: Low

El límite de 800 líneas es un punto de control, no un bloqueo, y una HU nunca se divide en varios PR (AGENTS.md §4).

### Unidades de trabajo

| Unidad | Objetivo | Prueba focalizada | Arnés de ejecución | Límite de reversión |
| --- | --- | --- | --- | --- |
| 1 | `GET /carta`, `_url_de_imagen` y esquemas | `pytest tests/modules/productos -k "carta or imagen"` | `TestClient` de FastAPI con SQLite temporal | Revertir el commit 1; sin esquema |
| 2 | Extraer `SelectorEstado` de `ProductosTab` | `npx vitest run src/modules/productos/components` | Pruebas existentes de `ProductosTab` | Revertir el commit 2 |
| 3 | Tipos, `obtenerCarta`, `CartaPage` y componentes | `npx vitest run src/modules/productos/api.test.ts src/modules/productos/pages/CartaPage.test.tsx src/modules/productos/components` | `fetch` simulado y `MemoryRouter` | Revertir el commit 3 |
| 4 | Botón «Ver carta» y ruta `lazy` en `App.tsx` | `npx vitest run src/modules/productos/pages/ProductosPage.test.tsx` | `MemoryRouter` con `useNavigate` | Revertir el commit 4 |
| 5 | Artefactos de SDD | N/A (solo documentos) | N/A | Revertir el commit 5 |

## Fase 1. Backend: `GET /carta` (I1 a I7)

- [x] **1.1** (Refactor, pruebas en verde antes y después) `service.py`: extraer `_url_de_imagen(producto)` y usarlo en `_a_salida`. Sin cambio de comportamiento: `pytest tests/modules/productos` sigue verde.
- [x] **1.2** (Rojo) `test_router.py`, CA 1: secciones por `orden, nombre, id`; productos por `nombre, id`; sección con plato, postre y bebida; campos de S81 con `precio` `"1500.00"`, `imagen_url` con imagen y `null` sin imagen. Falla por 404.
- [x] **1.3** (Rojo) `test_router.py`, CA 2 y estado inválido (S79, S92): sin `estado` igual a `HABILITADO`; sin bajas con Habilitados; 422 parametrizado (`estado=ABIERTO`, `estado=habilitado`, `limit=0`, `limit=101`, `offset=-1`).
- [x] **1.4** (Rojo) `test_router.py`, CA 3: habilitada sin productos, habilitada con solo deshabilitados y deshabilitada con habilitados quedan ocultas; `total` cuenta solo las visibles.
- [x] **1.5** (Rojo) `test_router.py`, CA 4: habilitada con un deshabilitado muestra solo ese; habilitada sin bajas no figura; deshabilitada con `productos: []`; los habilitados de una deshabilitada no aparecen.
- [x] **1.6** (Rojo) `test_router.py`, CA 5 y orden (S85): Todos trae las tres secciones (una vacía) con `estado` en cada sección y producto, `total` 3; empate de `orden` por `nombre` y de `nombre` por `id`.
- [x] **1.7** (Rojo) `test_router.py`, paginación (S80): `limit=2&offset=0` y `limit=1&offset=1` con `total` completo; la consulta no modifica datos y `GET /productos` y `GET /secciones` responden igual (solo lectura).
- [x] **1.8** (Rojo) `test_service.py`: `test_listar_carta_ejecuta_tres_sentencias_sql` con 3 secciones y un contador en `before_cursor_execute` (sin N+1, I3); con `ids` vacío no se ejecuta la tercera consulta.
- [x] **1.9** (Verde) `schemas.py`: `FiltroCarta(FiltroProductos)`, `ProductoCarta`, `SeccionCarta` con el `field_serializer` de `precio` (I2, I6). `repository.py`: `_condicion_de_carta`, `listar_secciones_de_carta`, `listar_productos_de_secciones` (I3 a I5).
- [x] **1.10** (Verde) `service.py`: `_a_producto_carta` y `listar_carta` con agrupado por `seccion_id` (I6, I7). `router.py`: `GET /carta` que solo delega (I1). Funciones ≤ 50 líneas y complejidad ≤ 10.
- [x] **1.11** Verificar desde `backend/`: `ruff check --fix . && ruff format .` y luego `ruff check . && ruff format --check . && lint-imports && pytest`.
- [x] **1.12** Commit 1: `feat: agrega la consulta de la carta por secciones en el backend (HU-M1-14)`. Rollback: revertir el commit; sin cambios de esquema.

## Fase 2. Frontend: extraer `SelectorEstado` (I10)

- [x] **2.1** Línea base: correr `npx vitest run src/modules/productos/components/ProductosTab.test.tsx src/modules/productos/pages/ProductosPage.test.tsx` y confirmar que pasan antes de tocar código.
- [x] **2.2** (Refactor) Crear `components/SelectorEstado.tsx` moviendo `SelectorEstado` de `ProductosTab.tsx` sin cambios de comportamiento (las opciones salen de `FILTROS_ESTADO`); `ProductosTab.tsx` lo importa. Las pruebas existentes siguen verdes sin editarlas.
- [x] **2.3** Verificar desde `frontend/`: `npm run format` y luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`.
- [x] **2.4** Commit 2: `chore: extrae el selector de estado de la pestaña de productos (HU-M1-14)` (`refactor` no está entre los tipos permitidos). Rollback: revertir el commit.

## Fase 3. Frontend: api, tipos, página y componentes (I8, I9, I11 a I13)

- [x] **3.1** (Rojo) `api.test.ts`: `obtenerCarta` pide `limit=100` y `offset` creciente hasta `total` (150: dos páginas concatenadas); página vacía corta el ciclo; fallo en la segunda página devuelve `{ exito: false, error }`.
- [x] **3.2** (Rojo) `ProductoCartaTarjeta.test.tsx`: nombre, precio con `formatearMoneda`, descripción, etiquetas, imagen con `alt` y `loading="lazy"`; sin descripción se omite; sin imagen, «Sin imagen»; insignia de estado solo si se pide (S87).
- [x] **3.3** (Rojo) `CartaSeccion.test.tsx`: `<section id="seccion-{id}">` con título e insignia de estado; «Sección sin productos.» en Todos y «Sin productos dados de baja» en Deshabilitados (S97, CA 4 y 5).
- [x] **3.4** (Rojo) `CartaPage.test.tsx`: abre en «Habilitados» y llama `obtenerCarta('HABILITADO')` (CA 2); secciones en orden con enlaces `#seccion-{id}` y sin píldoras de ocultas (I11); cambiar a Deshabilitados y Todos vuelve a pedir; insignias solo fuera de Habilitados; vacíos de S88 por filtro; error «No se pudo cargar la carta.» con «Reintentar»; reingreso arranca en Habilitados.
- [x] **3.5** (Verde) `types.ts`: `ProductoCarta` y `SeccionCarta`. `api.ts`: `obtenerCarta(estado)` (I8).
- [x] **3.6** (Verde) Crear `components/ProductoCartaTarjeta.tsx`, `CartaSeccion.tsx`, `CartaNavegacion.tsx`, `CartaVista.tsx` (carga, error, vacío o contenido; `CARTA_VACIA`) y `pages/CartaPage.tsx` (textos de S99).
- [x] **3.7** Verificar desde `frontend/`: `npm run format` y luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`.
- [x] **3.8** Commit 3: `feat: agrega la pantalla de la carta con sus secciones y productos (HU-M1-14)`. Rollback: revertir el commit.

## Fase 4. Frontend: entrada y ruta (I14)

- [x] **4.1** (Rojo) `ProductosPage.test.tsx`: el encabezado muestra «Ver carta» y al pulsarlo navega a `/productos/carta`. Falla por texto ausente.
- [x] **4.2** (Verde) `ProductosPage.tsx`: botón «Ver carta» (`variant="outline"`, icono `BookOpen`) en `acciones` de `PageHeader`.
- [x] **4.3** (Verde) **Código compartido (avisar al equipo, AGENTS.md §9.3).** `frontend/src/App.tsx`: `lazy` de `CartaPage` y `<Route path="productos/carta">`. Se comprueba con `npm run build` y la navegación de 4.1.
- [x] **4.4** Verificar desde `frontend/`: `npm run format` y luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`.
- [x] **4.5** Commit 4: `feat: agrega el botón Ver carta y la ruta de la carta (HU-M1-14)`. Rollback: revertir el commit.

## Fase 5. Cierre

- [x] **5.1** CI completa. Backend desde `backend/` con el entorno virtual activo: `ruff check . && ruff format --check . && lint-imports && pytest`, cobertura ≥ 70 %. Frontend desde `frontend/`: `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`, cobertura ≥ 60 %. No bajar umbrales ni desactivar reglas.
- [x] **5.2** Regresión: pruebas de productos, secciones y `ProductosTab` sin cambios de comportamiento; `alembic heads` desde `backend/` muestra una sola cabeza, sin migración nueva.
- [x] **5.3** Comprobar que cada escenario de la spec tiene una prueba que pasa (ver la trazabilidad).
- [x] **5.4** Escribir `openspec/changes/HU-M1-14/apply-progress.md` con las notas del PR (plantilla `.github/pull_request_template.md`, `Closes #19`, hacia `develop`): supuestos a validar S79 a S99; aviso del cambio compartido `frontend/src/App.tsx` (§9.3); tamaño medido de cada lado contra el punto de control de 800.
- [x] **5.5** Commit 5 (artefactos de SDD, tarea de apply, no se deja al orquestador): `docs: agrega los artefactos de SDD de HU-M1-14 (HU-M1-14)`. Incluye `exploration.md` (si existe), `proposal.md`, `specs/`, `design.md`, `tasks.md`, `apply-progress.md` y, si existe, `verify-report.md`. Rollback: revertir el commit.

## Trazabilidad

| Criterio / escenario de la spec | Tareas |
| --- | --- |
| #19 CA 1 Secciones en orden con productos, categorías, imagen, sin imagen, sin descripción | 1.2, 3.2, 3.4 |
| #19 CA 2 Filtro inicial en Habilitados, sin bajas, reingreso | 1.3, 3.4 |
| #19 CA 3 Ocultar secciones sin productos habilitados | 1.4, 3.4 |
| #19 CA 4 Deshabilitados y aviso «Sin productos dados de baja» | 1.5, 3.3, 3.4 |
| #19 CA 5 Todos, estado en cada sección y producto, sección vacía | 1.6, 3.3, 3.4 |
| Orden estable, empates de `orden` y `nombre` (S85) | 1.6 |
| Paginación por sección y `total` (S80) | 1.4, 1.7, 3.1 |
| El frontend completa todas las páginas; fallo en la segunda | 3.1 |
| Estado inválido y límites 422 (S79, S92) | 1.3 |
| Solo lectura sin efectos | 1.7 |
| Tres sentencias SQL sin N+1 (I3) | 1.8 |
| `_url_de_imagen` reutilizado (I6) | 1.1, 1.2, 1.10 |
| Entrada «Ver carta» y ruta `lazy` | 4.1 a 4.3 |
| Filtro de estado en la pantalla (cambiar a Deshabilitados y Todos) | 3.4 |
| Navegación por secciones y píldoras según el filtro | 3.4 |
| Estados vacíos y error de carga (S88) | 3.4 |
| `SelectorEstado` extraído sin cambio de comportamiento (I10) | 2.1, 2.2 |
| Regresión de productos y secciones | 1.1, 1.11, 2.1, 5.2 |
