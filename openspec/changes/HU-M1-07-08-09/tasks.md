# Tareas: HU-M1-07-08-09 Crear, modificar y dar de baja una bebida

- **Issues:** #10 (HU-M1-07), #11 (HU-M1-08) y #12 (HU-M1-09) · **Rama:** `feature/HU-M1-07-08-09-bebida` · **Entrada:** `proposal.md` (S42 a S46), `specs/carta-productos/spec.md`, `design.md` (G1 a G8).
- Strict TDD: la prueba falla primero (404 o 405 de la ruta, tipo, texto o asterisco ausente) y recién después se escribe el código.
- Una unidad de trabajo = un commit (Conventional Commits, en español, con `(HU-M1-07-08-09)`). Tipos permitidos: `feat`, `fix`, `docs`, `test`, `ci`, `chore`. Un solo PR hacia `develop`, sin PR encadenados.
- Orden: secuencial. Las Fases 2 y 3 (frontend) no dependen de la Fase 1, pero se recomienda el orden numérico.
- Pruebas del backend en `backend/tests/modules/productos/`, con nombres `test_<función>_<caso>`. Pruebas del frontend junto al archivo que prueban.

## Pronóstico de carga de revisión

| Campo | Valor |
| --- | --- |
| Backend (cambios estimados) | ≈ 330 líneas (≈ 40 de código, ≈ 290 de pruebas) |
| Frontend (cambios estimados) | ≈ 235 líneas (≈ 55 de código, ≈ 180 de pruebas) |
| Estimated changed lines | ≈ 565 en total; cada lado se mide contra su propio punto de control de 800 |
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
| 1 | Rutas `POST`, `GET`, `PUT` y `POST .../baja` de bebidas | `pytest tests/modules/productos -k "bebida or alta"` | `TestClient` de FastAPI con SQLite temporal (las propias pruebas) | Revertir el commit 1; sin esquema |
| 2 | Configuración de bebidas, correcciones G4 y G5, ruta y botón del alta | `npx vitest run src/modules/productos src/App.test.tsx` | `MemoryRouter` con la API simulada (las propias pruebas) | Revertir el commit 2 |
| 3 | Ruta de edición y acciones en la fila de bebidas | `npx vitest run src/modules/productos/pages/ProductoEditarPage.test.tsx src/modules/productos/components/AccionesProducto.test.tsx src/App.test.tsx` | `MemoryRouter` con `useConfirm` simulado | Revertir el commit 3; la fila de bebidas vuelve a no tener acciones |
| 4 | Artefactos de SDD | N/A (solo documentos) | N/A | Revertir el commit 4 |

## Fase 1. Backend: alta, consulta, modificación y baja de una bebida (G1, G2, G7)

- [x] **1.1** (Rojo) `test_schemas.py`: `BebidaCrear` fija `CATEGORIA` `BEBIDA` y el mensaje «La bebida ya está registrada», acepta sin ingredientes y rechaza ingredientes vacíos o repetidos; `BebidaModificar` fija categoría y mensaje y rechaza `categoria`. Falla por clase ausente.
- [x] **1.2** (Rojo) `test_router.py`: `ALTA_BEBIDA` entra en el `fixture` `alta` (≈ 15 pruebas del alta: forma 201, imagen, HEIC, 404, 409 con su mensaje, 422 por campo, `categoria` rechazada, estado fijo, atomicidad); la tabla de 422 suma `["  "]` en ingredientes. Las dos pruebas genéricas de ingredientes obligatorios pasan a `test_crear_producto_sin_ingredientes_422` parametrizada sobre plato y postre.
- [x] **1.3** (Rojo) `test_router.py`, alta propia: `test_crear_bebida_sin_ingredientes_201` (parametrizado: ausentes y `[]`) y `test_crear_bebida_con_nombre_de_postre_convive` (S14; el segundo alta de la misma bebida da 409).
- [x] **1.4** (Rojo) `test_router.py`, bloque de bebidas, un escenario por criterio, todos fallan con 404 o 405: `test_consultar_bebida_existente`, `test_modificar_bebida_datos_validos`, `test_modificar_bebida_ingredientes_etiquetas_e_imagen`, `test_modificar_bebida_quita_todos_los_ingredientes_200` (S44), `test_modificar_bebida_nombre_duplicado_409` (incluye uno deshabilitado), `test_modificar_bebida_mismo_nombre_que_plato_200`, `test_modificar_bebida_datos_invalidos_422` (precio, ingredientes repetidos), `test_modificar_bebida_conserva_identidad`, `test_modificar_bebida_reactivar_200`.
- [x] **1.5** (Rojo) `test_router.py`, baja y aislamiento: `test_dar_de_baja_bebida_200`, `test_dar_de_baja_bebida_ya_deshabilitada_409`, `test_dar_de_baja_bebida_conserva_datos_e_imagen`, `test_dar_de_baja_bebida_usada_por_otra_tabla_200`, `test_reactivar_bebida_tras_la_baja_200`, `test_bebida_con_id_de_postre_404` (parametrizado sobre `GET`, `PUT` y `POST .../baja`) y el 404 por id inexistente en las tres operaciones.
- [x] **1.6** (Verde) `schemas.py`: `BebidaCrear(ProductoCrear)` y `BebidaModificar(BebidaCrear, ProductoModificar)` sin redefinir `ingredientes` (G1). `router.py`: `crear_bebida`, `consultar_bebida`, `modificar_bebida` y `dar_de_baja_bebida`, funciones explícitas que delegan al `service` (G2). Sin cambios en `service`, `repository`, `models`, `shared/` ni migraciones.
- [x] **1.7** Verificar desde `backend/`: `ruff check --fix . && ruff format .` y luego `ruff check . && ruff format --check . && lint-imports && pytest`. Las pruebas de platos y postres siguen verdes.
- [x] **1.8** Commit 1: `feat: agrega crear, modificar y dar de baja una bebida en el backend (HU-M1-07-08-09)`. Rollback: revertir el commit; no hay cambios de esquema.

## Fase 2. Frontend: configuración de bebidas y alta (G3 a G6, G8) (independiente de la Fase 1)

- [x] **2.1** (Rojo) `categorias.test.ts`: `esCategoriaEdicion` (`BEBIDA` verdadero, `MENU_DEL_DIA` falso); `rutaDeEdicion('BEBIDA', 7)` = `/productos/bebidas/7/editar`; `CONFIGURACIONES.BEBIDA` y `CONFIGURACIONES_EDICION.BEBIDA` con los textos de S46 e `ingredientesObligatorios: false`. Fallan por clave ausente.
- [x] **2.2** (Rojo) `api.test.ts`: la fila `BEBIDA` suma `POST /bebidas` (alta), `PUT /bebidas/7` y `POST /bebidas/7/baja`.
- [x] **2.3** (Rojo) `validarProducto.test.ts`: el 409 «La bebida ya está registrada.» se asigna al campo «Nombre» (G4); el de plato y postre no cambia.
- [x] **2.4** (Rojo) `useFormularioProducto.test.tsx` y `ProductoNuevoPage.test.tsx`: `CATEGORIAS` suma `BEBIDA`; la aserción de ingredientes obligatorios pasa a `it.each` con el valor esperado por categoría; el 409 usa un `Record<CategoriaAlta, string>`. Casos de bebida: guarda sin ingredientes con `crearProducto('BEBIDA', {… ingredientes: []})`, sin asterisco en «Ingredientes» (con asterisco en plato y postre, G5), rechaza el chip vacío y el repetido, título «Nueva bebida» y botón «Guardar bebida».
- [x] **2.5** (Rojo) `ProductosTab.test.tsx` y `App.test.tsx`: tercer botón «Nueva bebida» hacia `/productos/bebidas/nuevo`; `App` monta esa ruta. Fallan por botón y ruta ausentes.
- [x] **2.6** (Verde) `categorias.ts`: `CategoriaAlta` suma `BEBIDA`; `CategoriaEdicion` sigue como `Extract` con `BEBIDA`; `CONFIGURACIONES.BEBIDA`, `CONFIGURACIONES_EDICION.BEBIDA` y `SEGMENTOS_RUTA.BEBIDA = 'bebidas'` (G3). `api.ts`: `ENDPOINTS.BEBIDA = '/bebidas'`.
- [x] **2.7** (Verde) `components/validarProducto.ts`: `errorDelServidor` reconoce `/ya está registrad[oa]/i` (G4). `components/FormularioProducto.tsx`: `configuracion` suma `ingredientesObligatorios` y lo pasa como `required` a `ListaDeTextos` (G5); `pages/ProductoEditarPage.tsx` lo toma de `CONFIGURACIONES[categoria]`.
- [x] **2.8** (Verde) `components/ProductosTab.tsx`: botón literal «Nueva bebida» en `BotonesAlta` (G6). **Código compartido (avisar al equipo, AGENTS.md §9.3).** `frontend/src/App.tsx`: ruta `productos/bebidas/nuevo` con `<ProductoNuevoPage categoria="BEBIDA" />` en `lazy`. Sin impacto en otros módulos.
- [x] **2.9** Verificar desde `frontend/`: `npm run format` y luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`.
- [x] **2.10** Commit 2: `feat: agrega la configuración y el alta de una bebida en el frontend (HU-M1-07-08-09)`. Rollback: revertir el commit.

## Fase 3. Frontend: edición y acciones por fila (G6, G8) (depende de la Fase 2)

- [x] **3.1** (Rojo) `ProductoEditarPage.test.tsx`: `describe` de bebidas: «Cargando bebida...», «Editar bebida» con los datos cargados, guardar llama a `modificarProducto('BEBIDA', ...)` y avisa «Bebida modificada», guardar tras quitar todos los chips de ingredientes, 404 muestra «La bebida no existe.», «Dar de baja» confirma y avisa «Bebida dada de baja», bebida deshabilitada sin «Dar de baja» y con el interruptor apagado, sin asterisco en «Ingredientes». Fallan por la ruta ausente.
- [x] **3.2** (Rojo) `AccionesProducto.test.tsx`: la fila `BEBIDA` entra en el `describe.each` (enlace a `/productos/bebidas/:id/editar`, confirmar envía `darDeBajaProducto('BEBIDA', id)`, cancelar no envía nada); bebida deshabilitada ofrece «Editar» sin «Dar de baja»; el caso «sin acciones» pasa de `BEBIDA` a `MENU_DEL_DIA` (S45, S57).
- [x] **3.3** (Rojo) `App.test.tsx`: el `it.each` de rutas de edición suma `/productos/bebidas/:id/editar`.
- [x] **3.4** (Verde) **Código compartido (avisar al equipo, AGENTS.md §9.3).** `frontend/src/App.tsx`: ruta `productos/bebidas/:id/editar` con `<ProductoEditarPage categoria="BEBIDA" />` en `lazy`. `AccionesProducto` no cambia: `esCategoriaEdicion` ya la deriva de `CONFIGURACIONES_EDICION`.
- [x] **3.5** (Regresión) Ajustar solo lo que cambie por la enmienda de S27 en `ProductosTabla.test.tsx` y `ProductosTab.test.tsx` (la fila de bebida ya no carece de acciones). Las demás pruebas pasan sin cambios.
- [x] **3.6** Verificar desde `frontend/`: `npm run format` y luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`.
- [x] **3.7** Commit 3: `feat: agrega editar y dar de baja una bebida en el frontend (HU-M1-07-08-09)`. Rollback: revertir el commit.

## Fase 4. Cierre

- [x] **4.1** CI completa de ambos lados. Backend desde `backend/` con el entorno virtual activo: `ruff check . && ruff format --check . && lint-imports && pytest` en verde, cobertura ≥ 70 %. Frontend desde `frontend/`: `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` en verde, cobertura ≥ 60 %. No bajar umbrales ni desactivar reglas.
- [x] **4.2** Regresión global: las pruebas de platos, postres, lista y `SeccionesTab` pasan sin cambios de comportamiento. `alembic heads` desde `backend/` muestra una sola cabeza, sin migración nueva.
- [x] **4.3** Comprobar que cada escenario de la spec (CA 1 a 14 de #10, CA 1 a 5 de #11, CA 1 a 4 de #12, atomicidad, enlaces de la fila y regresión) tiene una prueba que pasa (ver la trazabilidad).
- [x] **4.4** Dejar escritas las notas del PR en `openspec/changes/HU-M1-07-08-09/apply-progress.md` (plantilla `.github/pull_request_template.md`, `Closes #10`, `Closes #11` y `Closes #12`, hacia `develop`): supuestos a validar S42 a S48, S55 a S57 y, con M2, la baja de una bebida incluida en un menú vigente (S20); aviso del cambio en código compartido `frontend/src/App.tsx` (§9.3); tamaño medido de cada lado contra el punto de control de 800.
- [x] **4.5** Commit 4 (artefactos de SDD): `docs: agrega los artefactos de SDD de HU-M1-07-08-09 (HU-M1-07-08-09)`. Incluye `exploration.md`, `proposal.md`, `specs/`, `design.md`, `tasks.md`, `apply-progress.md` y, si existe, `verify-report.md`. Rollback: revertir el commit.

## Trazabilidad

Los CA de #11 y #12 son los de #7 y #8 (S42). Los CA de #10 siguen el orden de la spec (CA 1 a 14).

| Criterio / requisito de la spec | Tareas |
| --- | --- |
| #10 CA 1 Crear bebida, `BebidaCrear`, rutas del contrato | 1.1, 1.2, 1.6, 2.2, 2.4, 2.5, 2.8 |
| #10 CA 2 Campos obligatorios | 1.2, 2.4 |
| #10 CA 3 Nombre único entre bebidas (S43, G4) | 1.1, 1.2, 1.3, 2.3, 2.4 |
| #10 CA 4 Largo del nombre | 1.2, 2.4 |
| #10 CA 5 Precio válido | 1.2, 2.4 |
| #10 CA 6 Ingredientes opcionales y sin repetidos (S44, G5) | 1.1, 1.2, 1.3, 2.1, 2.4, 2.7 |
| #10 CA 7 Descripción opcional | 1.2, 2.4 |
| #10 CA 8 Sin secciones habilitadas | 2.4 |
| #10 CA 9 Sección habilitada y existente | 1.2, 2.4 |
| #10 CA 10 Imagen válida por contenido | 1.2, 2.4 |
| #10 CA 11 Imagen de archivo o cámara | 2.4 |
| #10 CA 12 HEIC se guarda como JPEG | 1.2 |
| #10 CA 13 Etiquetas opcionales y sin repetidas | 1.2, 2.4 |
| #10 CA 14 Registrar con solo los datos obligatorios | 1.2, 1.3, 2.4 |
| Estado asignado por el sistema y atomicidad del alta | 1.2, 2.4 |
| Botón «Nueva bebida» y ruta del alta (S45, G6) | 2.5, 2.8 |
| #11 CA 1 Modificar los datos; consultar una bebida | 1.4, 3.1 |
| #11 CA 2 Ingredientes (también vaciarlos), etiquetas e imagen | 1.4, 2.2, 3.1 |
| #11 CA 3 Reglas de validación del alta, mensaje de bebida | 1.1, 1.4, 3.1 |
| #11 CA 4 Las facturas conservan el precio (S18) | 1.4 |
| #11 CA 5 Reactivar una bebida deshabilitada | 1.4, 3.1 |
| Atomicidad de la modificación | 1.4 (reutiliza el `service`, ya probado con platos) |
| #12 CA 1 Dar de baja | 1.5, 2.2, 3.1, 3.2 |
| #12 CA 2 Cancelar la baja | 3.2 |
| #12 CA 3 La baja conserva los datos (S18) | 1.5 |
| #12 CA 4 Reactivar una bebida dada de baja | 1.5, 3.1, 3.2 |
| Aislamiento por categoría (E5, S34) | 1.5, 2.1 |
| Enlace de editar y baja desde la fila (S27 deja de regir, S57) | 2.1, 3.2, 3.5 |
| Ruta de edición (código compartido) | 3.3, 3.4, 4.4 |
| El alta y la edición de platos y postres no cambian (regresión) | 1.2, 1.7, 2.4, 2.9, 3.6, 4.2 |
