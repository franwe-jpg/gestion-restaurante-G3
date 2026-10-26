# Tareas: HU-M1-05-06 Modificar y dar de baja un postre

- **Issues:** #7 (HU-M1-05) y #8 (HU-M1-06) · **Rama:** `feature/HU-M1-05-06-modificar-baja-postre` · **Entrada:** `proposal.md`, `specs/carta-productos/spec.md` (S30 a S34), `design.md` (F1 a F9).
- Strict TDD: la prueba falla primero (404 o 405 de la ruta, tipo, función o texto ausente) y recién después se escribe el código.
- Una unidad de trabajo = un commit (Conventional Commits, en español, con `(HU-M1-05-06)`). Tipos permitidos: `feat`, `fix`, `docs`, `test`, `ci`, `chore`. Un solo PR hacia `develop`, sin PR encadenados.
- Orden: secuencial. Las Fases 2 y 3 (frontend) no dependen de la Fase 1 y podrían paralelizarse, pero se recomienda el orden numérico.
- Pruebas del backend en `backend/tests/modules/productos/`, con nombres `test_<función>_<caso>`. Pruebas del frontend junto al archivo que prueban.

## Pronóstico de carga de revisión

| Campo | Valor |
| --- | --- |
| Backend (cambios estimados) | ≈ 230 líneas (≈ 30 de código, ≈ 200 de pruebas) |
| Frontend (cambios estimados) | ≈ 200 líneas (≈ 40 de código y ≈ 5 borradas, ≈ 160 de pruebas) |
| Estimated changed lines | ≈ 430 en total; cada lado se mide contra su propio punto de control de 800 |
| 400-line budget risk | Low (ambos lados por debajo de 800) |
| Estrategia de entrega | `single-pr`: un PR con 4 commits |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: none
400-line budget risk: Low

El límite de 800 líneas es un punto de control, no un bloqueo, y una HU nunca se divide en varios PR (AGENTS.md §4).

### Unidades de trabajo

| Unidad | Objetivo | Prueba focalizada | Arnés de ejecución | Límite de reversión |
| --- | --- | --- | --- | --- |
| 1 | Rutas `GET`, `PUT` y `POST .../baja` de postres | `pytest tests/modules/productos -k postre` | `TestClient` de FastAPI con SQLite temporal (las propias pruebas) | Revertir el commit 1; sin esquema |
| 2 | Configuración de edición de postres y ruta `/productos/postres/:id/editar` | `npx vitest run src/modules/productos/categorias.test.ts src/modules/productos/api.test.ts src/modules/productos/pages/ProductoEditarPage.test.tsx src/App.test.tsx` | `MemoryRouter` con la API simulada (las propias pruebas) | Revertir el commit 2; las filas de postres siguen sin acciones |
| 3 | «Editar» y «Dar de baja» en las filas de postres | `npx vitest run src/modules/productos/components/AccionesProducto.test.tsx` | `MemoryRouter` con `useConfirm` simulado | Revertir el commit 3; vuelve la fila sin acciones |
| 4 | Artefactos de SDD | N/A (solo documentos) | N/A | Revertir el commit 4 |

## Fase 1. Backend: consultar, modificar y dar de baja un postre (F1, F2, F8)

- [x] **1.1** (Rojo) `test_schemas.py`: `PostreModificar` fija `categoria` `POSTRE` y el mensaje «El postre ya está registrado», exige ingredientes (S33) y rechaza `categoria` (parametrizado con `PlatoModificar`). Falla por clase ausente.
- [x] **1.2** (Rojo) `test_router.py`: `_modificar` y `_baja` suman `ruta: str = RUTA_PLATOS`; `_crear_postre` reutiliza `_crear` con `ALTA_POSTRE`. Las pruebas de platos no cambian.
- [x] **1.3** (Rojo) `test_router.py`, bloque de postres, un escenario por criterio, todos fallan con 404 o 405: `test_consultar_postre_existente` (CA 1), `test_modificar_postre_datos_validos` (CA 1), `test_modificar_postre_ingredientes_etiquetas_e_imagen` (CA 2: la imagen anterior deja de servirse), `test_modificar_postre_nombre_duplicado_409` (CA 3, mensaje de postre, incluye uno deshabilitado), `test_modificar_postre_mismo_nombre_que_plato_200`, `test_modificar_postre_datos_invalidos_422` (parametrizado: precio, ingredientes vacíos), `test_modificar_postre_conserva_identidad` (CA 4, fila de `prueba_linea` intacta), `test_modificar_postre_reactivar_200` (CA 5, vuelve a `GET /api/v1/productos`).
- [x] **1.4** (Rojo) `test_router.py`, baja y aislamiento: `test_dar_de_baja_postre_200` (sale de `GET /productos`), `test_dar_de_baja_postre_ya_deshabilitado_409`, `test_dar_de_baja_postre_conserva_datos_e_imagen`, `test_dar_de_baja_postre_usado_por_otra_tabla_200`, `test_reactivar_postre_tras_la_baja_200` (visible con `estado=DESHABILITADO` antes), `test_postre_con_id_de_plato_404` (parametrizado sobre `GET`, `PUT` y `POST .../baja`; el plato queda intacto) y el 404 por id de plato en las tres operaciones.
- [x] **1.5** (Verde) `schemas.py`: `PostreModificar(PostreCrear, ProductoModificar)` (F1). `router.py`: `consultar_postre`, `modificar_postre` (con `datos_de(PostreModificar)` e `leer_imagen`) y `dar_de_baja_postre`, funciones explícitas que delegan al `service` (F2). Sin cambios en `service`, `repository`, `models`, `shared/` ni migraciones.
- [x] **1.6** Verificar desde `backend/`: `ruff check --fix . && ruff format .` y luego `ruff check . && ruff format --check . && lint-imports && pytest`. Las pruebas de platos y del alta siguen verdes.
- [x] **1.7** Commit 1: `feat: agrega modificar y dar de baja un postre en el backend (HU-M1-05-06)`. Rollback: revertir el commit; no hay cambios de esquema.

## Fase 2. Frontend: configuración de edición y ruta de la pantalla (F3 a F6, F9) (independiente de la Fase 1)

- [x] **2.1** (Rojo) `categorias.test.ts`: `esCategoriaEdicion` (`POSTRE` verdadero, `BEBIDA` y `MENU_DEL_DIA` falsos); `rutaDeEdicion` (`it.each`: `/productos/platos/7/editar` y `/productos/postres/7/editar`); `CONFIGURACIONES_EDICION.POSTRE` con los textos de S32 y `cargando` en ambas categorías. Fallan por función o clave ausente.
- [x] **2.2** (Rojo) `api.test.ts` (`it.each` plato y postre): `obtenerProducto`, `modificarProducto` (`PUT /postres/7` con `FormData`, CA 2) y `darDeBajaProducto` (`POST /postres/7/baja`).
- [x] **2.3** (Rojo) `ProductoEditarPage.test.tsx`: `abrir(id, categoria = 'PLATO')` y un `describe` de postres: «Cargando postre...», «Editar postre» con los datos cargados, guardar llama a `modificarProducto('POSTRE', ...)` y avisa «Postre modificado», 404 muestra «El postre no existe.», «Dar de baja» confirma y avisa «Postre dado de baja», postre deshabilitado sin «Dar de baja» y con el interruptor apagado. Las pruebas de platos no cambian.
- [x] **2.4** (Rojo) `App.test.tsx`: `it.each` que monta `/productos/platos/:id/editar` y `/productos/postres/:id/editar`. Falla por la ruta ausente.
- [x] **2.5** (Verde) `categorias.ts`: `CategoriaEdicion = Extract<CategoriaAlta, 'PLATO' | 'POSTRE'>`; `esCategoriaEdicion` derivada de `categoria in CONFIGURACIONES_EDICION`; `SEGMENTOS_RUTA` y `rutaDeEdicion`; `ConfiguracionEdicion.cargando`; `CONFIGURACIONES_EDICION.POSTRE` (F3 a F5).
- [x] **2.6** (Verde) `pages/ProductoEditarPage.tsx`: el `Spinner` usa `configuracion.cargando` en lugar del texto fijo «Cargando plato...».
- [x] **2.7** (Verde) **Código compartido (avisar al equipo, AGENTS.md §9.3).** `frontend/src/App.tsx`: ruta `productos/postres/:id/editar` con `<ProductoEditarPage categoria="POSTRE" />` en `lazy` (F6, D-19). Sin impacto en otros módulos.
- [x] **2.8** Verificar desde `frontend/`: `npm run format` y luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`.
- [x] **2.9** Commit 2: `feat: agrega la configuración y la ruta de edición de un postre (HU-M1-05-06)`. Rollback: revertir el commit.

## Fase 3. Frontend: acciones en la fila de un postre (F7, F9) (depende de la Fase 2)

- [x] **3.1** (Rojo) `AccionesProducto.test.tsx` con `describe.each` plato y postre: «Editar» es un `Link` a la ruta de su categoría; confirmar «Dar de baja» envía `darDeBajaProducto(categoria, id)`, avisa y llama `onDadoDeBaja`; cancelar no envía nada. Casos fijos: postre deshabilitado ofrece «Editar» y no «Dar de baja»; la fila `BEBIDA` no ofrece acciones. Falla porque el enlace está fijo a `/platos` y los postres no tienen acciones (S27).
- [x] **3.2** (Verde) `components/AccionesProducto.tsx`: usa `rutaDeEdicion(producto.categoria, producto.id)` bajo la guarda `esCategoriaEdicion` (F7). Sin tocar `useBajaProducto` ni `ProductosTabla`.
- [x] **3.3** (Regresión) Ajustar solo lo que cambie por la enmienda de S27 en `ProductosTabla.test.tsx` y `ProductosTab.test.tsx` (la fila de postre ya no carece de acciones). Las demás pruebas de la lista pasan sin cambios.
- [x] **3.4** Verificar desde `frontend/`: `npm run format` y luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`.
- [x] **3.5** Commit 3: `feat: agrega editar y dar de baja desde la fila de un postre (HU-M1-05-06)`. Rollback: revertir el commit.

## Fase 4. Cierre

- [x] **4.1** CI completa de ambos lados. Backend desde `backend/` con el entorno virtual activo: `ruff check . && ruff format --check . && lint-imports && pytest` en verde, cobertura ≥ 70 %. Frontend desde `frontend/`: `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` en verde, cobertura ≥ 60 %. No bajar umbrales ni desactivar reglas.
- [x] **4.2** Regresión global: las pruebas de platos, del alta de postres, de la lista y de `SeccionesTab` pasan sin cambios. `alembic heads` desde `backend/` muestra una sola cabeza, sin migración nueva.
- [x] **4.3** Comprobar que cada escenario de la spec (CA 1 a 5 de #7, CA 1 a 4 de #8, atomicidad, enlaces de la fila y regresión) tiene una prueba que pasa (ver la trazabilidad).
- [x] **4.4** Redactar las notas del PR (plantilla `.github/pull_request_template.md`, `Closes #7` y `Closes #8`, hacia `develop`): supuestos a validar S30 a S33 y, con M2, la baja de un postre incluido en un menú vigente (S20); aviso del cambio en código compartido `frontend/src/App.tsx` (§9.3); tamaño medido de cada lado contra el punto de control de 800.
- [x] **4.5** Commit 4 (artefactos de SDD): `docs: agrega los artefactos de SDD de HU-M1-05-06 (HU-M1-05-06)`. Rollback: revertir el commit.

## Trazabilidad

| Criterio / requisito de la spec | Tareas |
| --- | --- |
| Consultar un postre; deshabilitado consultable (#8 CA 4) | 1.3, 1.4, 2.3 |
| Modificar los datos (#7 CA 1) | 1.3, 2.3 |
| Ingredientes, etiquetas e imagen (#7 CA 2) | 1.3, 2.2 |
| Reglas de validación del alta (#7 CA 3) | 1.1, 1.3, 2.3 |
| Atomicidad de la modificación | 1.3 (reutiliza el `service`, ya probado con platos) |
| Las facturas conservan el precio (#7 CA 4, S18) | 1.3 |
| Reactivar un postre deshabilitado (#7 CA 5) | 1.3, 2.3 |
| Dar de baja (#8 CA 1) | 1.4, 2.2, 2.3, 3.1 |
| Cancelar la baja (#8 CA 2) | 3.1 |
| La baja conserva los datos (#8 CA 3, S18) | 1.4 |
| Reactivar un postre dado de baja (#8 CA 4) | 1.4, 2.3, 3.1 |
| Aislamiento por categoría (E5, S34) | 1.4, 2.1 |
| Enlace de editar en platos y postres (S31) | 2.1, 3.1 |
| Dar de baja desde la fila de platos y postres | 3.1 |
| Ruta de la pantalla (código compartido) | 2.4, 2.7, 4.4 |
| El alta y la edición de platos no cambian | 1.6, 2.8, 3.3, 4.2 |
