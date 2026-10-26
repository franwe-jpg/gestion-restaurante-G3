# Progreso de apply: HU-M1-02-03-13

- **Lote 1 de 2:** Fases 1 a 3 (backend). Modo Strict TDD, `pytest`.
- **Lote 2 de 2:** Fases 4 a 8 (frontend y cierre). Modo Strict TDD, Vitest. Con esto las 8 fases quedan completas.
- **Lote 3:** Fases 9 a 11 (backend de HU-M1-13). Modo Strict TDD, `pytest`.
- **Lote 4:** Fases 12 a 16 (frontend de HU-M1-13 y cierre). Modo Strict TDD, Vitest.
- **Rama:** `feature/HU-M1-02-03-modificar-baja-plato`

## Tareas completadas

| Fase | Tareas | Commit |
| --- | --- | --- |
| 1. Consultar (`GET /platos/{id}`) | 1.1 a 1.4 | `90f9de7` |
| 2. Modificar (`PUT /platos/{id}`) | 2.1 a 2.7 | `d1ca30b` |
| 3. Baja (`POST /platos/{id}/baja`) | 3.1 a 3.4 | `6591926` |
| 4. Extraer `FormularioProducto` (E8) | 4.1 a 4.4 | `a64e338` |
| 5. Capa de datos y código compartido | 5.1 a 5.6 | `b8b7ac1` |
| 6. `hooks` de edición y baja | 6.1 a 6.6 | `5f9f0ec` |
| 7. Pantalla de edición, selector de imagen y ruta | 7.1 a 7.8 | `e9829fb` |
| 8. Cierre | 8.1 a 8.5 | commit `docs:` de los artefactos |
| 9. Esquemas de la lista (HU-M1-13) | 9.1 a 9.4 | `2183230` |
| 10. `repository` y `service` de la lista | 10.1 a 10.4 | `e847258` |
| 11. `router` de la lista y regresión | 11.1 a 11.5 | `ce90453` |
| 12. Tipos, capa de datos y filtros | 12.1 a 12.4 | `638c41a` |
| 13. `ProductosTabla` | 13.1 a 13.4 | `8229c28` |
| 14. `AccionesProducto` y texto E13 | 14.1 a 14.5 | `a5389bb` |
| 15. `ProductosTab` y `ProductosPage` | 15.1 a 15.5 | `01e0611` |
| 16. Cierre de HU-M1-13 | 16.1 a 16.6 | commit `docs:` de los artefactos |

## Evidencia TDD

| Fase | Rojo | Verde |
| --- | --- | --- |
| 1 | 4 fallas (`test_consultar_plato_existente`, `..._deshabilitado_200`, `test_obtener_producto_existente`, `..._otra_categoria_error`): 405 de la ruta y función ausente. Los dos 404 del router pasaron desde el inicio porque la ruta no existía (404 por ruta inexistente). | 228 pruebas pasan |
| 2 | `test_schemas.py` y `test_service.py` fallan en la importación (`PlatoModificar` ausente); 33 fallas en `test_router.py` (405 de la ruta) | 288 pruebas pasan |
| 3 | 7 fallas (4 del router por 405, 3 del service por función ausente). Los 404 de baja y `test_reactivar_plato_tras_la_baja_200` pasaron desde el inicio (la ruta no existía; el plato seguía habilitado). | 298 pruebas pasan, cobertura 99,27 % |
| 4 | Extracción pura: las 130 pruebas de `productos` pasaban antes (línea base) | 130 pasan después, sin tocar pruebas |
| 5 | `putFormulario`, `urlDelBackend`, `precioParaEditar`, `obtenerProducto`, `modificarProducto`, `darDeBajaProducto` y `urlDeImagen` ausentes (17 fallas) | 176 pruebas pasan |
| 6 | `useCampos`/`useEnvioProducto` no exportados (5 fallas) y módulos `useEdicionProducto` y `useBajaProducto` ausentes (2 archivos sin cargar) | 191 pruebas pasan |
| 7 | `ProductoEditarPage` ausente (archivo sin cargar), ruta de `App` ausente e imagen actual ausente en `SelectorImagen` (2 fallas) | 210 pruebas pasan |
| 9 | `test_schemas.py` falla en la importación (`FiltroProductos`, `FiltroEstadoProducto` y `ProductoListado` ausentes) | 71 pruebas del archivo pasan; suite: 306 |
| 10 | 8 fallas en `test_service.py` (parámetro `estado` ausente y campos `precio`, `etiquetas`, `estado` ausentes). `test_listar_productos_por_defecto_solo_habilitados` pasó desde el inicio (regresión de la llamada actual). | suite: 315 |
| 11 | 5 fallas en `test_router.py` (campos ausentes y `estado` ignorado: `ANULADO` no daba 422). Las pruebas de CA 2, CA 3, CA 4, límites, paginación y regresión pasaron desde el inicio (comportamiento previo igual). | suite: 328, cobertura 99,29 % |
| 12 | `listarProductos`, `ETIQUETAS_CATEGORIA`, `esCategoriaEdicion` y `FILTROS_ESTADO` ausentes (3 archivos de prueba en rojo, 7 fallas) | 219 pruebas pasan |
| 13 | `ProductosTabla` ausente (archivo sin cargar) | 228 pasan |
| 14 | `AccionesProducto` ausente (archivo sin cargar) y 2 fallas por el texto anterior («desde esta pantalla») | 234 pasan |
| 15 | `ProductosTab` ausente (archivo sin cargar) y 4 fallas en `ProductosPage.test.tsx` (seguía el `EmptyState` de «pendiente») | 245 pasan |


## Comandos corridos antes de cada commit (desde `backend/`, con `.venv`)

`ruff check --fix . && ruff format .` y luego `ruff check . && ruff format --check . && lint-imports && pytest`: todo en verde (10 contratos de importación cumplidos). Resultado final: `298 passed`, cobertura 99,27 % (umbral 70 %).

## Desviaciones y notas

- E2: la herencia múltiple `PlatoModificar(PlatoCrear, ProductoModificar)` funcionó con Pydantic; no hizo falta el respaldo.
- E4: `_guardar_producto` recibe `archivo_nuevo` explícito; el alta pasa su `archivo`. Hay una prueba de que un `commit` fallido con imagen conservada no borra el archivo vigente.
- E3: el borrado del archivo anterior usa `contextlib.suppress(OSError)` (regla SIM105 de Ruff).
- Se agregaron pruebas fuera de la lista: `test_modificar_plato_sin_estado_conserva_el_actual`, `test_modificar_plato_deshabilitar_con_estado_200`, `test_modificar_plato_con_categoria_enviada_422`, `test_modificar_plato_de_postre_404`, `test_modificar_producto_commit_fallido_con_imagen_conservada_no_la_borra` y `test_dar_de_baja_producto_otra_categoria_error`.
- Mensaje 404 de sección en `PUT`: «La sección {id} no existe» (reutiliza `_validar_seccion_habilitada`).
- Sin cambios en `shared/`, `models`, migraciones ni `frontend/`.

## Lote 2: frontend y cierre

### Comandos corridos antes de cada commit (desde `frontend/`)

`npm run format` y luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`: todo en verde (0 advertencias de lint, sin `any`). Resultado final: 22 archivos y `210 passed`; cobertura global del frontend: sentencias 71,59 %, ramas 68,75 %, funciones 68,42 %, líneas 74,15 % (umbral 60 %). Build correcto.

### Verificación final (8.1 a 8.3)

- Backend (`ruff check . && ruff format --check . && lint-imports && pytest`): `298 passed`, cobertura 99,27 % (umbral 70 %), 10 contratos de importación cumplidos.
- `alembic heads`: una sola cabeza, `c4e6a8b0d2f4`, sin migración nueva en este cambio.
- Cada escenario de la spec tiene una prueba que pasa: backend en `backend/tests/modules/productos/` (Fases 1 a 3) y frontend en `ProductoEditarPage.test.tsx`, `useEdicionProducto.test.tsx`, `useBajaProducto.test.tsx`, `SelectorImagen.test.tsx`, `App.test.tsx` y la regresión del alta en `ProductoNuevoPage.test.tsx` (sin cambios; el estado fijo «Habilitado» sin interruptor ya estaba cubierto).

### Desviaciones del lote 2

- `FormularioProducto` recibe un único objeto opcional `edicion` (`estado`, `onCambiarEstado`, `imagenActual`, `onQuitarImagenActual`, `acciones`) en lugar de `modo`, `acciones` e `imagenActual` por separado: sin `edicion` el formulario es el del alta. Recibe `configuracion` como `Pick<ConfiguracionAlta, 'botonGuardar' | 'avisoSinSecciones'>` porque `ConfiguracionEdicion` no define esos textos.
- `seccionesParaEditar` vive en `components/seccionesParaEditar.ts` (un archivo de página no puede exportar funciones sin romper la regla de Fast Refresh) y trabaja con `Pick<SeccionListado, 'id' | 'nombre'>`.
- `useEnvioProducto` recibe `guardar(datos: ProductoCrear)` en lugar de construir la llamada a la API: así la edición y el alta comparten validación y manejo de errores (E9). `useFormularioProducto` conserva su API.
- Con una imagen nueva elegida, `quitar_imagen` se envía `false` aunque se haya quitado la actual (la nueva reemplaza); evita el 422 de «quitar y reemplazar».
- Si se elige una imagen nueva, el selector oculta la imagen actual; al descartar la nueva reaparece la actual (salvo que ya se haya quitado).
- El 404 del plato se distingue de otros errores de carga por el texto «no existe» del mensaje del servidor (`useApi` solo expone el mensaje); un id inválido muestra «El plato no existe.» sin llamar a la API.
- La baja usa un `Button` `danger` en el pie del formulario, a la izquierda de «Cancelar»; un error del servidor al dar de baja se avisa con un toast `danger`.
- Pruebas fuera de la lista: `useCampos` sin valores iniciales, error por defecto de `useEnvioProducto`, `quitar_imagen` con imagen nueva, error de la baja, otro error de carga, no repetir la sección habilitada.

## Notas para el PR

Plantilla `.github/pull_request_template.md`, hacia `develop`, con `Closes #3`, `Closes #4` y `Closes #18`.

- **Supuestos a validar por el equipo:** S15 a S29 (en especial S24, S25 y S26). HU-M1-13: S26 (la lista muestra platos, postres y bebidas; los menús del día de M2 se suman cuando M2 los exponga por su `service`), S27 (editar solo en platos), S28 (baja desde la fila, solo platos habilitados) y S29 (`estado` por defecto `HABILITADO` en `/productos`, a diferencia de «todas» en `/secciones`, E14). Con M2, S20: la baja de un plato incluido en un menú vigente no se bloquea. S18: `Factura` no existe todavía, M6 debe copiar el precio al emitir.
- **Código compartido (AGENTS.md §9.3), avisar al equipo:**
  - `frontend/src/shared/api/client.ts`: método `putFormulario<T>` y función exportada `urlDelBackend(ruta)`. `get`, `post` y `postFormulario` no cambian. Pruebas en `client.test.ts`.
  - `frontend/src/App.tsx`: ruta `productos/platos/:id/editar` con `ProductoEditarPage` en `lazy`. Prueba en `App.test.tsx`; además se actualizó la prueba «monta una pantalla placeholder de modulo» porque `/productos` ya no muestra el pendiente sino la lista (HU-M1-13).
  - HU-M1-13 no suma cambios en `shared/` ni en el módulo de M2.
- **Diferencias con la maqueta (HU-M1-13):** el filtro de estado es un `Select` en lugar de botones segmentados (E18); no hay búsqueda, filtro de categoría ni miniatura de imagen; la columna «Sección» viene de la maqueta y de la respuesta de la API. La diferencia de E13 (baja solo en la edición) quedó resuelta: la baja también está en la fila del plato habilitado, con el mismo `ConfirmDialog` y el texto «… desde la pantalla de edición.».
- **Grupo ABM:** HU-M1-02, HU-M1-03 y HU-M1-13 comparten un cambio de SDD (`HU-M1-02-03-13`), una rama y un PR, según la regla que propone el PR #179 (ABM y listado de una misma entidad con el mismo responsable). HU-M1-13 lista, en sentido estricto, más de una entidad (incluye el menú del día de M2); el responsable de M1 aprobó incluirla en forma explícita. Mientras #179 no se integre, es una desviación de la regla de una rama por tarea. La rama conserva el nombre `feature/HU-M1-02-03-modificar-baja-plato` porque el PR #180 ya está abierto. Los issues #3, #4 y #18 se cierran juntos.
- **Tamaño final (informativo, un solo PR; `git diff --shortstat origin/develop..HEAD`):** backend 7 archivos, 1.349 líneas agregadas y 37 borradas (pruebas incluidas) contra 800; frontend 34 archivos, 2.379 agregadas y 256 borradas contra 800 (≈ 180 de movimiento mecánico en el commit `a64e338`, revisable aparte). Una HU nunca se divide en varios PR.
- **Commits:** `90f9de7`, `d1ca30b`, `6591926` (backend, HU-M1-02-03); `a64e338`, `b8b7ac1`, `5f9f0ec`, `e9829fb` (frontend, HU-M1-02-03); `db08090` y el `docs:` final (artefactos); `2183230`, `e847258`, `ce90453` (backend, HU-M1-13); `638c41a`, `8229c28`, `a5389bb`, `01e0611` (frontend, HU-M1-13).

## Lote 3: backend de HU-M1-13 (Fases 9 a 11)

- Comandos antes de cada commit: `ruff check --fix . && ruff format .` y luego `ruff check . && ruff format --check . && lint-imports && pytest`: verde, 10 contratos cumplidos. Final: `328 passed`, cobertura 99,29 % (umbral 70 %). `alembic heads`: una sola cabeza, `c4e6a8b0d2f4`, sin cambios.
- `repository.listar_productos_habilitados` pasó a `listar_productos(db, parametros, estado)`; el único llamador era `service.listar_productos`. Sin `estado`, `GET /api/v1/productos` devuelve los mismos ítems, orden (`nombre, id`) y total; solo suma `precio`, `etiquetas` y `estado`.
- Desviación menor: el `router` usa `Annotated[FiltroProductos, Query()]` (igual que `FiltroSecciones`) en lugar de `Depends()`; el alias `Paginacion` quedó sin uso y se eliminó. `ProductoListado` serializa `precio` con dos decimales (`"12500.50"`) con su propio `field_serializer`.
- Pruebas fuera de la lista: `test_listar_productos_estado_invalido_error` también cubre `limit` 0 y 101 por separado en schemas y router.
- Sin cambios en `shared/`, `models`, migraciones ni `frontend/`.

## Lote 4: frontend de HU-M1-13 y cierre (Fases 12 a 16)

- Comandos antes de cada commit (desde `frontend/`): `npm run format` y luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`: verde (0 advertencias, sin `any`). Final: 27 archivos y `245 passed`; cobertura global: sentencias 72,38 %, ramas 69,37 %, funciones 69,23 %, líneas 74,57 % (umbral 60 %). Build correcto.
- Backend (Fase 16): `ruff check . && ruff format --check . && lint-imports && pytest`: `328 passed`, cobertura 99,29 %, 10 contratos cumplidos. `alembic heads`: una sola cabeza, `c4e6a8b0d2f4`, sin migración nueva.
- Spec y diseño ya coinciden (E13, E14, E21): no hubo nada que alinear; las preguntas abiertas de alinear la spec quedan resueltas.
- Cada escenario de HU-M1-13 tiene prueba: CA 1, 2, 6 y S26 en `ProductosTabla.test.tsx`; CA 3, 5, 6, paginación y E22 en `ProductosTab.test.tsx`; S27 y S28 en `AccionesProducto.test.tsx`; texto E13 en `useBajaProducto.test.tsx` y `ProductoEditarPage.test.tsx`; regresión del selector en `api.test.ts` y `SeccionesTab.test.tsx` (sin cambios); estado inválido en backend (Fases 9 y 11).

### Desviaciones del lote 4

- `ProductosTabla` recibe `renderAcciones` (opcional) en lugar de importar `AccionesProducto`: sigue siendo presentación pura y `ProductosTab` conecta las acciones (14.3 y 15.3).
- `FILTROS_ESTADO` es una tupla no vacía y `filtrosEstado.ts` exporta `filtroDe(valor)`; los textos de vacío usan los campos `vacioTitulo` y `vacioDescripcion`.
- `ProductosTab` se dividió en `BotonesAlta` y `SelectorEstado` para respetar el límite de 50 líneas por función.
- Se actualizó `App.test.tsx` (prueba del placeholder de `/productos`), ya que la pestaña ahora carga la lista.
- Pruebas fuera de la lista: `esCategoriaEdicion` para `MENU_DEL_DIA`, acciones de cada fila y la baja que retrocede de página (E22).
