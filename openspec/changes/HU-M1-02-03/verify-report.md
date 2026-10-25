# Informe de verificación: HU-M1-02-03 Modificar y dar de baja un plato

- **Veredicto: PASS WITH WARNINGS** (0 CRITICAL, 2 WARNING, 3 SUGGESTION)
- **Rama:** `feature/HU-M1-02-03-modificar-baja-plato` (8 commits sobre `origin/develop`, `90f9de7..7b87c0e`) · **Modo:** Strict TDD · **Criterios vigentes:** HU-M1-02 (#3) CA 1 a 5 y HU-M1-03 (#4) CA 1 a 4.

## 1. Ejecución de la CI (AGENTS.md §7)

| Lado | Comando | Resultado |
| --- | --- | --- |
| Backend | `ruff check . && ruff format --check . && lint-imports && pytest` | Todo en verde: `298 passed`, cobertura 99,27 % (umbral 70 %), 10 contratos de importación cumplidos |
| Frontend | `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` | Todo en verde: 22 archivos, `210 passed`, 0 advertencias de lint, cobertura global 71,59 % sentencias / 74,15 % líneas (umbral 60 %), build correcto |
| Migraciones | `alembic heads` | Una sola cabeza, `c4e6a8b0d2f4`; no hay migración nueva |

Las 76 pruebas de backend de consultar, modificar, baja y reactivar corren y pasan de forma aislada. Todos los nombres de prueba que cita `tasks.md` existen en `backend/tests/`.

## 2. Trazabilidad de escenarios (spec → prueba → resultado)

Backend: `backend/tests/modules/productos/{test_router,test_service,test_schemas}.py`. Frontend: `frontend/src/modules/productos/...` y `frontend/src/App.test.tsx`. Todas pasan.

| Requisito y escenario | Prueba | Res. |
| --- | --- | --- |
| Consultar: plato existente | `test_consultar_plato_existente`, `test_obtener_producto_existente` | OK |
| Consultar: id inexistente o de otra categoría | `test_consultar_plato_inexistente_404`, `test_consultar_plato_de_otra_categoria_404`, `test_obtener_producto_otra_categoria_error` | OK |
| Consultar: formulario cargado | `ProductoEditarPage.test`: «muestra los datos actuales con «Editar plato» y «Guardar cambios»» | OK |
| Modificar: cambio válido | `test_modificar_plato_datos_validos` | OK |
| Modificar: sin cambiar el nombre | `test_modificar_plato_mismo_nombre_200`, `test_modificar_producto_nombre_propio_permitido` | OK |
| Modificar: desde la pantalla | `ProductoEditarPage.test`: «guarda con una sola solicitud PUT, avisa y vuelve a «Productos»» | OK |
| Ingredientes y etiquetas | `test_modificar_plato_ingredientes_y_etiquetas` | OK |
| Imagen conservada / reemplazada / quitada | `test_modificar_plato_imagen_conservada`, `..._imagen_reemplazada`, `..._imagen_quitada` | OK |
| Quitar y reemplazar a la vez (422) | `test_modificar_plato_quitar_y_reemplazar_422` | OK |
| Cambios en el formulario (chips, imagen quitada) | `ProductoEditarPage.test`: «envía los chips cambiados y la imagen quitada»; `useEdicionProducto.test` | OK |
| Validación: nombre / precio / ingredientes / etiquetas y descripción / imagen | `test_modificar_plato_nombre_invalido_422`, `..._precio_invalido_422`, `..._ingredientes_invalidos_422`, `..._etiquetas_y_descripcion_invalidas_422`, `..._imagen_invalida_422`; `test_plato_modificar_*` | OK |
| Nombre duplicado (incluye deshabilitado) y mismo nombre que un postre | `test_modificar_plato_nombre_duplicado_409`, `test_modificar_plato_mismo_nombre_que_postre_200` | OK |
| Sección inexistente o deshabilitada | `test_modificar_plato_seccion_inexistente_404`, `..._seccion_deshabilitada_409`, `test_modificar_producto_seccion_sin_cambio_no_se_valida` | OK |
| Error indicado / 409 en el formulario | `ProductoEditarPage.test` («con errores locales no envía y marca cada campo», «muestra el 409 bajo el nombre y conserva lo escrito»); `useEdicionProducto.test` | OK |
| Atomicidad: falla el commit | `test_modificar_producto_commit_fallido_conserva_imagen_anterior`, `..._con_imagen_conservada_no_la_borra`, `test_modificar_producto_error_al_borrar_anterior_se_ignora` | OK |
| Facturas conservan el precio (CA 4, S18) | `test_modificar_plato_conserva_identidad_y_filas_relacionadas` | OK |
| Reactivación (+ sección deshabilitada, estado inválido) | `test_modificar_plato_reactivar_200`, `..._reactivar_en_seccion_deshabilitada_200`, `..._estado_invalido_422` | OK |
| Reactivar desde el formulario | `ProductoEditarPage.test`: «reactiva un plato deshabilitado desde el formulario» | OK |
| El estado no se edita en el alta | `ProductoNuevoPage.test`: «muestra el estado fijo «Habilitado» sin control para cambiarlo» | OK |
| Baja confirmada | `test_dar_de_baja_plato_200`, `test_dar_de_baja_producto_solo_cambia_estado` | OK |
| Baja de uno ya deshabilitado (409) / inexistente o postre (404) | `test_dar_de_baja_plato_ya_deshabilitado_409`, `..._inexistente_404`, `..._de_postre_404` | OK |
| Baja de un plato usado por otra tabla | `test_dar_de_baja_plato_usado_por_otra_tabla_200` | OK |
| Baja desde la pantalla | `ProductoEditarPage.test`: «da de baja tras confirmar en el diálogo, avisa y vuelve»; `useBajaProducto.test` | OK |
| Cancelar la baja (CA 2) | `ProductoEditarPage.test`: «cancelar el diálogo no envía ninguna solicitud»; `useBajaProducto.test`: «al cancelar no envía nada» | OK |
| La baja conserva datos y filas (CA 3) | `test_dar_de_baja_plato_conserva_datos_e_imagen`, `test_dar_de_baja_plato_usado_por_otra_tabla_200` | OK |
| Plato deshabilitado consultable / reactivar tras la baja | `test_consultar_plato_deshabilitado_200`, `test_reactivar_plato_tras_la_baja_200` | OK |
| Pantalla de edición de un plato deshabilitado | `ProductoEditarPage.test` (interruptor apagado y sin «Dar de baja» en la prueba de reactivación) | OK (ver SUGGESTION 1) |
| Regresión del alta | `ProductoNuevoPage.test` (sin modificar), `useFormularioProducto.test`, suites de alta de backend | OK |
| Ruta de edición | `App.test`: «monta la pantalla de edición de un plato en /productos/platos/:id/editar» | OK |
| Código compartido | `client.test.ts` (`putFormulario`, `urlDelBackend`) | OK |

Todos los escenarios de la spec tienen al menos una prueba que pasa. Los cinco criterios de HU-M1-02 y los cuatro de HU-M1-03 quedan cubiertos (el filtro de Deshabilitados del CA 4 de HU-M1-03 está fuera de alcance, S17).

## 3. Reglas del proyecto

| Regla | Resultado |
| --- | --- |
| Capas: `router` solo delega; `service` sin FastAPI ni `HTTPException`; consultas en `repository`; devuelve `schemas` | Cumple (`grep` sin `HTTPException`/`fastapi` en `service.py`; `lint-imports` 10/10) |
| Excepciones de `shared/excepciones.py`, errores `{"detalle"}`, 404/409/422 | Cumple (`NoEncontradoError`, `ReglaDeNegocioError`, `DatosInvalidosError`; pruebas de status) |
| Sin `any`; llamadas a la API por `api.ts`; ESLint 0 advertencias | Cumple (`grep` sin `any`; los componentes no usan `fetch`) |
| Funciones de hasta 50 líneas y complejidad 10 | Cumple en el código de este cambio (Ruff C901 ≤ 10; ESLint con `max-lines-per-function` 50 y `complexity` 10 sin hallazgos en archivos nuevos o modificados que no sean pruebas). Ver WARNING 2 |
| Módulos ajenos y `shared/` | Solo `productos/` y, en código compartido, `frontend/src/shared/api/client.ts` y `frontend/src/App.tsx` (más sus pruebas), como autoriza la spec. Sin cambios en `backend/app/shared/`, `models` ni migraciones |
| Commits | 8 commits Conventional Commits en español con `(HU-M1-02-03)`; 0 con `Co-Authored-By` |
| Dependencias, `.env`, reglas de lint, umbrales, CI | Sin cambios |

## 4. Adherencia al diseño

- **E1:** `POST /platos/{producto_id}/baja` sin cuerpo (`router.py`, función explícita `dar_de_baja_plato`) y el frontend reutiliza `post` con `{}`. Cumple D-24.
- **E4:** `_guardar_producto(db, producto, mensaje, archivo_nuevo)` recibe el archivo nuevo explícito; `_descartar` borra solo ese archivo; la imagen conservada no se borra (prueba dedicada).
- **E3/E7:** el anterior se borra tras el `commit` con `contextlib.suppress(OSError)`; los campos se asignan como listas nuevas.
- **E6, orden de validación:** forma (dependencia) → imagen + `quitar_imagen` → `imagenes.procesar` → 404 plato → sección solo si cambia → nombre libre excluyendo el propio id → guardar archivo → `commit`. Coincide con `modificar_producto`.
- E2, E5, E8 a E13: coinciden con el código y las desviaciones documentadas en `apply-progress.md` (objeto `edicion` en `FormularioProducto`, `seccionesParaEditar` en `components/`) son menores y están justificadas.

## 5. Hallazgos

### CRITICAL

Ninguno.

### WARNING

1. **Tamaño por encima del punto de control (informativo).** Frontend ≈ 1.550 líneas agregadas y backend ≈ 930 contra 800. La regla del proyecto lo admite (un solo PR, §4) y `tasks.md` lo declara; debe anotarse en el PR con el commit de extracción `a64e338` revisable aparte.
2. **`SeccionesTab.tsx` (HU-M1-04, no de este cambio) tiene una función de 56 líneas** al medirla con `max-lines-per-function` 50, y varios bloques `describe` de pruebas superan 50 líneas. La regla RNF-MAN-05 no está activada en ESLint, por eso la CI no lo detecta. Este cambio no empeora el caso en código de producción. Conviene que el equipo decida si activa la regla.

### SUGGESTION

1. El escenario «Pantalla de edición de un plato deshabilitado» se comprueba de forma compuesta dentro de la prueba de reactivación; una prueba propia («no ofrece Dar de baja y el interruptor aparece apagado») lo haría explícito.
2. El 404 del plato se distingue de otros errores de carga por el texto «no existe» del mensaje del servidor (desviación documentada); frágil si cambia el mensaje. Considerar exponer el código de estado desde `useApi`.
3. Antes del PR, avisar al equipo los cambios de código compartido (`client.ts`, `App.tsx`; AGENTS.md §9.3) y validar S20 con M2 (baja de un plato en un menú vigente) y S24/S25.

### Observación del proyecto (no es un defecto de este cambio)

`frontend/vite.config.ts` solo mide cobertura de `App.tsx` y `src/shared`, así que la cobertura de `src/modules` no se calcula ni cuenta para el umbral de 60 %. Se confirmó que los archivos nuevos del módulo sí se ejercitan: `ProductoEditarPage`, `FormularioProducto`, `useEdicionProducto`, `useBajaProducto`, `SelectorImagen`, `seccionesParaEditar`, `api.ts` y `validarProducto` tienen archivos de prueba que pasan (210 pruebas en 22 archivos), y la ruta lazy se prueba en `App.test.tsx`.

## 6. Estado de las tareas

Las tareas de `tasks.md` (fases 1 a 8) están marcadas como completas y coinciden con el estado del código y de los commits (`90f9de7`, `d1ca30b`, `6591926`, `a64e338`, `b8b7ac1`, `5f9f0ec`, `e9829fb`, `7b87c0e`). Evidencia de rojo y verde por fase registrada en `apply-progress.md`.
