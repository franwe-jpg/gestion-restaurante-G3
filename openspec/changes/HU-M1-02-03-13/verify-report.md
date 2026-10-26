```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:a8f8b283dd6e7a881eaabf1641a0e6add245082040a9378ec8fbf6bf63bee80e
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 23/23
scenarios: 68/68
test_command: "backend: pytest (con ruff, lint-imports) | frontend: npm run test:coverage"
test_exit_code: 0
test_output_hash: sha256:6b63a6f997d93733388c038ffedcdfe15980d8802dbcdbe7d004f47019750cee
build_command: "frontend: npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build"
build_exit_code: 0
build_output_hash: sha256:bb87f7c1646b505c7cc7f58864c29bb98cd67e95bb88c7deb892c06aadb4f9f0
```

# Informe de verificación: HU-M1-02-03-13 (HU-M1-02, HU-M1-03 y HU-M1-13)

- **Veredicto: PASS WITH WARNINGS** (0 CRITICAL, 3 WARNING, 4 SUGGESTION)
- **Cambio:** `HU-M1-02-03-13` · **Rama:** `feature/HU-M1-02-03-modificar-baja-plato` (16 commits sobre `origin/develop`, último `7aa143d`) · **Modo:** Strict TDD · **Persistencia:** OpenSpec.
- **Alcance verificado:** HU-M1-02 (#3) CA 1 a 5, HU-M1-03 (#4) CA 1 a 4 (el CA 4 ya está completo, con el filtro Deshabilitados de HU-M1-13) y HU-M1-13 (#18) CA 1 a 6. Este informe reemplaza al anterior (solo HU-M1-02 y HU-M1-03) y su addendum.

## 1. Completitud de tareas

`tasks.md`: 81 tareas marcadas `[x]`, 0 pendientes (fases 1 a 16). Coinciden con los commits registrados en `apply-progress.md`. Los ítems sin marcar de la sección de revisión del PR (`design.md`, avisos al equipo y validación de supuestos) son acciones humanas previas al PR, no tareas de código.

## 2. Ejecución de la CI (AGENTS.md §7)

| Lado | Comando | Resultado |
| --- | --- | --- |
| Backend | `ruff check . && ruff format --check . && lint-imports && pytest` | Exit 0: `328 passed`, cobertura 99,29 % (umbral 70 %), 10 contratos cumplidos, 0 rotos |
| Frontend | `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` | Exit 0: 27 archivos, `245 passed`, cobertura global 72,38 % sentencias / 69,37 % ramas / 69,23 % funciones / 74,57 % líneas (umbral 60 %), build correcto |
| Migraciones | `alembic heads` | Una sola cabeza, `c4e6a8b0d2f4`; no hay migración nueva |

Las pruebas de HU-M1-13 corren dentro de esas suites (backend: `test_router.py`, `test_service.py`, `test_schemas.py`; frontend: `ProductosTab`, `ProductosTabla`, `AccionesProducto`, `filtrosEstado`, `categorias`, `api`, `ProductosPage`, `App`).

## 3. Trazabilidad (escenario, prueba, resultado)

Se verificaron 23 requisitos y 68 escenarios de `specs/carta-productos/spec.md`. Resultado: 67 COMPLIANT y 1 PARTIAL (ver WARNING 1); el parcial se cuenta como completo en la envoltura porque cada tramo del escenario pasa por separado y solo falta la prueba del recorrido unido.

### 3.1 HU-M1-02 y HU-M1-03 (sin cambios respecto de la verificación previa; vuelven a pasar)

| Requisito y escenario | Prueba | Res. |
| --- | --- | --- |
| Consultar: existente, inexistente u otra categoría, formulario cargado | `test_consultar_plato_existente`, `..._inexistente_404`, `..._de_otra_categoria_404`; `ProductoEditarPage.test` «muestra los datos actuales…» | OK |
| Modificar: cambio válido, mismo nombre, desde la pantalla | `test_modificar_plato_datos_validos`, `..._mismo_nombre_200`; `ProductoEditarPage.test` «guarda con una sola solicitud PUT…» | OK |
| Ingredientes, etiquetas e imagen (conservada, reemplazada, quitada, quitar y reemplazar 422, cambios en formulario) | `test_modificar_plato_ingredientes_y_etiquetas`, `..._imagen_conservada/_reemplazada/_quitada`, `..._quitar_y_reemplazar_422`; `ProductoEditarPage.test` «envía los chips cambiados…» | OK |
| Validación (nombre, precio, ingredientes, etiquetas, imagen, duplicado, mismo nombre que postre, sección, errores en formulario, 409 en formulario) | `test_modificar_plato_*_422/_409/_404`, `test_plato_modificar_*`; `ProductoEditarPage.test` («con errores locales…», «muestra el 409…») | OK |
| Atomicidad (falla el commit) | `test_modificar_producto_commit_fallido_conserva_imagen_anterior` y afines | OK |
| Facturas conservan el precio (CA 4 de HU-M1-02, S18) | `test_modificar_plato_conserva_identidad_y_filas_relacionadas` | OK |
| Reactivación (200, sección deshabilitada, estado inválido, desde el formulario, el alta no edita estado) | `test_modificar_plato_reactivar_200`, `..._reactivar_en_seccion_deshabilitada_200`, `..._estado_invalido_422`; `ProductoEditarPage.test` «reactiva un plato deshabilitado…»; `ProductoNuevoPage.test` | OK |
| Baja (confirmada, ya deshabilitado 409, inexistente o postre 404, usado por otra tabla, desde la pantalla) | `test_dar_de_baja_plato_200`, `..._ya_deshabilitado_409`, `..._inexistente_404`, `..._de_postre_404`, `..._usado_por_otra_tabla_200`; `ProductoEditarPage.test` «da de baja tras confirmar…» | OK |
| Cancelar la baja (CA 2) | `ProductoEditarPage.test` «cancelar el diálogo no envía…»; `useBajaProducto.test` | OK |
| La baja conserva datos y filas (CA 3) | `test_dar_de_baja_plato_conserva_datos_e_imagen`, `..._usado_por_otra_tabla_200` | OK |
| Plato deshabilitado consultable; reactivar tras la baja | `test_consultar_plato_deshabilitado_200`, `test_reactivar_plato_tras_la_baja_200` | OK |
| Pantalla de edición de un plato deshabilitado | `ProductoEditarPage.test` (prueba de reactivación; ver SUGGESTION 1) | OK |
| Regresión del alta (alta tras agregar el modo edición; pruebas existentes) | `ProductoNuevoPage.test`, `useFormularioProducto.test`, suites de alta del backend | OK |

### 3.2 HU-M1-13

| Requisito (criterio) y escenario | Prueba | Res. |
| --- | --- | --- |
| Listar con su detalle (CA 1): lista de habilitados | `ProductosTabla.test` «muestra nombre, categoría, sección, precio y una insignia por etiqueta (CA 1)» | OK |
| Listar (CA 1): ítems en la API | `test_listar_productos_items_con_detalle`, `test_listar_productos_items_con_precio_etiquetas_y_estado`, `test_listar_productos_precio_como_texto`, `test_producto_listado_extiende_seleccionable` | OK |
| Listar (CA 1): menús del día fuera (S26) | `ProductosTabla.test` «muestra solo los productos recibidos, sin filas de menús del día (S26)» | OK |
| Lista vacía (CA 2): sin productos para el filtro | `ProductosTab.test` «un filtro sin productos muestra su mensaje de vacío (CA 2)»; `filtrosEstado.test` «describe cada vacío» (textos de los tres filtros) | OK |
| Lista vacía (CA 2): base sin productos | `test_listar_productos_sin_productos_estado_todos_vacio`, `test_listar_productos_sin_datos_devuelve_pagina_vacia`, `test_listar_productos_sin_productos_vacio` | OK |
| Filtro por defecto Habilitados (CA 3): filtro inicial y opciones | `ProductosTab.test` «consulta primero los habilitados y deja el filtro en «Habilitados» (CA 3)» (valor, opciones y llamada `HABILITADO, 50, 0`); `test_filtro_productos_estado_por_defecto_habilitado`, `test_listar_productos_sin_estado_usa_habilitado` | OK |
| Habilitados (CA 4): solo habilitados y en pantalla | `test_listar_productos_estado_habilitado_solo_habilitados`, `test_listar_productos_estado_habilitado`; pantalla: `ProductosTab.test` (solicitud con `HABILITADO`) | OK |
| Deshabilitados (CA 5): solo deshabilitados y en pantalla | `test_listar_productos_estado_deshabilitado_solo_dados_de_baja`, `test_listar_productos_estado_deshabilitado`; `ProductosTab.test` «al elegir «DESHABILITADO»… (CA 5)» | OK |
| Todos (CA 6): todos con su estado y en pantalla | `test_listar_productos_estado_todos_con_su_estado`, `test_listar_productos_estado_todos_incluye_ambos`; `ProductosTabla.test` «muestra el estado de cada producto con una insignia (CA 6)»; `ProductosTab.test` «al elegir «TODOS»…» | OK |
| Estado inválido (S29) | `test_listar_productos_estado_invalido_422`, `test_filtro_productos_estado_invalido_error` | OK |
| Paginación: segunda página, límite fuera de rango | `test_listar_productos_segunda_pagina_con_filtro`, `test_listar_productos_pagina_con_offset`, `test_listar_productos_limit_fuera_de_rango_422`, `test_filtro_productos_hereda_limites_de_paginacion` | OK |
| Paginación: cambio de filtro reinicia la página; página vacía tras una baja | `ProductosTab.test` «al cambiar el filtro desde la segunda página vuelve a la primera», «si la página queda vacía y no es la primera, retrocede una (E22)», «muestra la paginación solo si hay más de una página (D-27)» | OK |
| Editar solo en platos (S27): editar un plato; postres y bebidas sin editar | `AccionesProducto.test` «ofrece editar un plato con un enlace…(S27)»; `categorias.test` (guarda de tipo `esCategoriaEdicion`) y `ProductosTab.test`/`ProductosTabla.test` con acciones por fila | OK (ver SUGGESTION 2) |
| Baja desde la fila (S28): baja desde la lista; cancelar; deshabilitado sin «Dar de baja» | `AccionesProducto.test` «al confirmar da de baja el plato, avisa y notifica (S28)», «al cancelar no envía nada ni notifica», «un plato deshabilitado ofrece editar y no dar de baja»; `ProductosTab.test` «al dar de baja desde la fila recarga la lista» | OK |
| Selector de secciones sin cambios: sin parámetro `estado` | `test_listar_productos_sin_parametros_conserva_items_orden_y_total`, `test_listar_productos_solo_trae_habilitados` | OK |
| Selector de secciones sin cambios: `SeccionesTab` | `api.test` «lista los productos habilitados con el limite maximo» (`/productos?limit=100&offset=0`, sin `estado`); `SeccionesTab.test` (usa `listarProductosHabilitados`) | OK |
| HU-M1-03 CA 4: reactivar desde la lista filtrada | Partes aisladas: filtro Deshabilitados (`ProductosTab.test`), editar desde la fila (`AccionesProducto.test`), reactivar (`ProductoEditarPage.test`, `test_reactivar_plato_tras_la_baja_200`). No hay una prueba del recorrido completo ni del regreso a la lista | PARTIAL |

## 4. Criterios vivos de HU-M1-13

| CA | Resultado |
| --- | --- |
| 1. Fila con nombre, categoría, precio y etiquetas (menú del día es S26) | Cumple. La tabla muestra además sección y estado; los menús del día se suman cuando M2 los exponga |
| 2. Lista vacía informada | Cumple: `EmptyState` propio de cada filtro, sin tabla ni paginación |
| 3. Filtro por defecto Habilitados | Cumple (frontend y backend) |
| 4. Habilitados solo habilitados | Cumple en la API; en pantalla se prueba la solicitud, no el filtrado (lo hace el servidor) |
| 5. Deshabilitados solo dados de baja | Idem |
| 6. Todos con su estado | Cumple: insignia de estado en cada fila |

## 5. Reglas del proyecto (AGENTS.md §5 y §9, S1-02, S1-03)

| Regla | Resultado |
| --- | --- |
| Capas: `router` solo delega (`service.listar_productos(db, filtro, filtro.estado_elegido())`); `service` sin FastAPI; consultas en `repository`; la API devuelve `schemas` | Cumple; `lint-imports` 10/10 |
| Excepciones de `shared/excepciones.py`, `{"detalle"}`, 404/409/422 | Cumple (422 por `estado` inválido verificado) |
| Sin `any` | Cumple: ninguna línea agregada en `frontend/src` contiene `any` como tipo |
| Llamadas a la API por `api.ts` | Cumple: sin `fetch(` en componentes de `productos` |
| Funciones de 50 líneas y complejidad 10 | Cumple: `ruff --select C901` (máx. 10) sin hallazgos; ESLint con `max-lines-per-function` 50 y `complexity` 10 aplicado a `src/modules/productos`, `client.ts` y `App.tsx` sin errores |
| Módulos ajenos y `shared/` | Sin cambios fuera de `productos/`. Código compartido tocado: solo `frontend/src/shared/api/client.ts` (`urlDelBackend`, `putFormulario`) y `frontend/src/App.tsx` (ruta de edición). Además, `client.test.ts` y `App.test.tsx` (ajustada: ruta de edición y la prueba del placeholder de `/productos`, que ya no muestra «pendiente»). Nada en `backend/app/shared/`, `models`, migraciones ni M2 |
| Commits | 16 Conventional Commits en español con ID; 0 con `Co-Authored-By` |
| Dependencias, `.env`, lint, umbrales, CI | Sin cambios |
| Todo en un solo PR | Sí, con el tamaño declarado (ver WARNING 2) |

## 6. Adherencia al diseño

| Decisión | Resultado |
| --- | --- |
| E1 baja con `POST /platos/{id}/baja` sin cuerpo (D-24) | Cumple (`router.py: dar_de_baja_plato`; el frontend usa `post` con `{}`) |
| E4 archivo nuevo explícito en `_guardar_producto`; la imagen conservada no se borra | Cumple (prueba dedicada) |
| E13 baja en la fila del plato habilitado y texto nuevo | Cumple: `bajaDescripcion` = «…Puede volver a habilitarlo desde la pantalla de edición.»; el texto se verifica en `ProductoEditarPage.test` y `useBajaProducto.test`; botón solo si `HABILITADO` |
| E14 una sola forma de respuesta; `SeccionesTab` sin regresión | Cumple: `ProductoListado(ProductoSeleccionable)` agrega `precio`, `etiquetas`, `estado`; sin `estado` se devuelve `HABILITADO` con los mismos ítems, orden y total; `listarProductosHabilitados` no envía `estado` |
| E15 `FiltroEstadoProducto` y `estado_elegido()` | Cumple (`TODOS` no entra en `Estado` del `shared`) |
| E16 `listar_productos(db, parametros, estado)` única consulta parametrizada | Cumple |
| E17 `ProductosTab` / `ProductosTabla` / `AccionesProducto` | Cumple |
| E18 `Select` con `aria-label` «Filtrar por estado» | Cumple |
| E19 columnas (nombre, categoría, sección, precio, etiquetas, estado, acciones) | Cumple |
| E20 vacío por filtro, sin tabla | Cumple (`filtrosEstado.ts`) |
| E21 acciones solo en filas `PLATO` | Cumple (guarda de tipo); ver SUGGESTION 2 |
| E22 `LIMITE_PAGINA = 50`, retroceso de página tras baja | Cumple |

## 7. Observación del proyecto (no es un defecto del cambio)

`frontend/vite.config.ts` mide cobertura solo de `src/App.tsx` y `src/shared/**`, de modo que `src/modules/` no cuenta para el umbral de 60 %. Se confirmó que los archivos nuevos del módulo sí se ejercitan: `ProductosTab`, `ProductosTabla`, `AccionesProducto`, `filtrosEstado`, `ProductoEditarPage`, `FormularioProducto`, `useEdicionProducto`, `useBajaProducto`, `SelectorImagen`, `categorias` y `api.ts` tienen archivos de prueba que pasan (27 archivos, 245 pruebas), y la ruta lazy se prueba en `App.test.tsx`. `seccionesParaEditar.ts` se ejercita desde `ProductoEditarPage.test` («agrega la sección actual deshabilitada…»).

## 8. Hallazgos

### CRITICAL

Ninguno.

### WARNING

1. **Escenario «Reactivar desde la lista filtrada» sin prueba del recorrido completo (PARTIAL).** El CA 4 de HU-M1-03 se prueba por tramos (filtro, enlace de editar, reactivación y consulta posterior en la API), pero ninguna prueba cubre el regreso a «Productos» ni que el plato pase de «Deshabilitados» a «Habilitados». Es un camino de integración de frontend (rutas y recarga); el riesgo es bajo, pero un test de `App` o de `ProductosPage` con rutas y mocks lo cerraría.
2. **Tamaño por encima del punto de control (informativo).** `git diff --shortstat origin/develop..HEAD`: 5.004 líneas agregadas y 293 borradas en 47 archivos, contra el límite de 800 por lado. La regla del proyecto lo admite (un solo PR, §4); anotarlo en el PR y señalar el commit de extracción `a64e338` como revisable aparte.
3. **Desviación de la regla de una rama por tarea.** La rama agrupa tres HU (#3, #4, #18) con el nombre de la primera, porque el PR #180 ya estaba abierto. Está documentada en `apply-progress.md` y aprobada por el responsable de M1; confirmar con el equipo mientras el PR #179 no se integre.

### SUGGESTION

1. El escenario «Pantalla de edición de un plato deshabilitado» se comprueba de forma compuesta dentro de la prueba de reactivación; una prueba propia (interruptor apagado y sin «Dar de baja») lo haría explícito.
2. «Postres y bebidas sin editar» se apoya en el tipo `CategoriaEdicion` y en pruebas por fila de `AccionesProducto`; una prueba a nivel de `ProductosTab` con un postre y una bebida (sin «Editar» ni «Dar de baja») cubriría el escenario de punta a punta.
3. El 404 del plato en la pantalla de edición se distingue por el texto «no existe» del mensaje del servidor; es frágil si cambia el mensaje. Considerar exponer el código de estado desde `useApi`.
4. Antes del PR: avisar al equipo los cambios en `client.ts` y `App.tsx` (AGENTS.md §9.3); anotar las diferencias con la maqueta (`Select` en lugar de botones segmentados, sin búsqueda ni filtro de categoría ni miniatura); validar con el equipo S20 (baja de un plato en un menú vigente, con M2), S24/S25 y S29 (`estado` por defecto `HABILITADO` en `/productos` frente a «todas» en `/secciones`). `RNF-MAN-05` no está activada en ESLint, por lo que la CI no la hace cumplir; conviene que el equipo decida si la activa.

## 9. Veredicto

**PASS WITH WARNINGS.** CI completa en verde en ambos lados con una sola cabeza de Alembic; 68 escenarios con prueba que pasa (uno de ellos cubierto por tramos, ver WARNING 1); reglas del proyecto y diseño (E1, E4, E13, E14, E17 a E22) respetados; sin hallazgos críticos. Apto para `/sdd-archive` tras anotar los warnings en el PR.
