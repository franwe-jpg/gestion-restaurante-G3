```yaml
schema: gentle-ai.verify-result/v1
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 8/8
scenarios: 28/28
evidence_revision: sha256:73a0a099ee8cec9f457bb300386053ca641a20a731c894d045e0eacc85042656
test_command: "backend: pytest (con ruff, lint-imports) | frontend: npm run test:coverage"
test_exit_code: 0
test_output_hash: sha256:21029c60fa6076de64abe4038c4283349048e33d116150e31535f48cfbc3080c
build_command: "frontend: npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build"
build_exit_code: 0
build_output_hash: sha256:aa9f69c5c581aa1bf3c071e00cd47afbc867a0815d3e59ce175ce560439f0a4d
```

# Informe de verificación: HU-M1-11-12 (HU-M1-11 y HU-M1-12)

- **Veredicto: PASS WITH WARNINGS** (0 CRITICAL, 2 WARNING, 3 SUGGESTION)
- **Cambio:** `HU-M1-11-12` · **Rama:** `feature/HU-M1-11-12-modificar-baja-seccion` (5 commits sobre `feature/HU-M1-07-08-09-bebida`: `3d05cbb`, `c644fe0`, `f0c86a1`, `521f209`, `2c30d3f`) · **Modo:** Strict TDD · **Persistencia:** OpenSpec.
- **Alcance verificado:** HU-M1-11 (#15) CA 1 a 7 y HU-M1-12 (#16) CA 1 a 4. Spec delta: 8 requisitos (7 agregados y 1 modificado, «Listar secciones») y 28 escenarios (22 y 6).
- `evidence_revision` es el SHA-256 de `git diff feature/HU-M1-07-08-09-bebida...HEAD` (HEAD `2c30d3f`). `test_output_hash` y `build_output_hash` son el SHA-256 de las últimas tres líneas de la salida de `pytest -q` (backend) y de `npm run lint && ... && npm run build` (frontend) de esta verificación.

## 1. Completitud de tareas

`tasks.md`: `grep -c "^- \[ \]"` = 0; todas las tareas de las Fases 1 a 5 están marcadas `[x]`. Coinciden con los commits de `apply-progress.md` (Fase 1 `3d05cbb`, Fase 2 `c644fe0`, Fase 3 `f0c86a1`, Fase 4 `521f209`, Fase 5 `2c30d3f`). Árbol de trabajo limpio al empezar.

## 2. Ejecución de la CI (AGENTS.md §7)

| Lado | Comando | Resultado |
| --- | --- | --- |
| Backend | `ruff check . && ruff format --check . && lint-imports && pytest` | Exit 0: `All checks passed!`, `69 files already formatted`, 10 contratos de importación cumplidos, `455 passed, 1 warning` (aviso de deprecación de `httpx` en `starlette.testclient`, ajeno al cambio), cobertura 99,38 % (umbral 70 %) |
| Frontend | `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` | Exit 0: `eslint --max-warnings=0` sin hallazgos, Prettier y `tsc` correctos, 29 archivos y `343 passed`, cobertura 72,44 % sentencias / 69,37 % ramas / 69,35 % funciones / 74,63 % líneas (umbral 60 %), build correcto |
| Migraciones | `alembic heads` | Una sola cabeza, `c4e6a8b0d2f4`; sin archivos nuevos en `backend/alembic/` |

Las cifras coinciden con las de `apply-progress.md` (455 y 343 pruebas, 99,38 % y 72,44 %).

## 3. Trazabilidad (requisito y escenario, prueba, resultado)

Rutas de las pruebas: backend `backend/tests/modules/productos/{test_router,test_schemas,test_service}.py`; frontend `frontend/src/modules/productos/{api.test.ts}`, `components/{AccionesSeccion,SeccionFormDialog,SeccionesTab,SeccionesTabla,useBajaSeccion}.test.tsx` y `frontend/src/shared/api/client.test.ts`. `test_router.py` abreviado `R`.

| Requisito y escenario | Prueba | Res. |
| --- | --- | --- |
| Consultar: sección existente | `R::test_obtener_seccion_con_productos`, `test_service::test_obtener_seccion_con_productos` | OK |
| Consultar: sección inexistente (`GET`, `PUT`, `POST .../baja`) | `R::test_seccion_inexistente_responde_404[get/put/post]`, `test_service::test_obtener_seccion_inexistente_lanza_no_encontrado` | OK |
| Modificar: cambio válido (CA 1) | `R::test_modificar_seccion_nombre_y_orden_200`; pantalla: `SeccionFormDialog edición` «envía los cambios, avisa y notifica…», «muestra el título de edición con el nombre y el orden precargados (CA 1)» | OK |
| Modificar: valor inválido (51 caracteres, orden 0, `"3"`), también con id inexistente | `R::test_modificar_seccion_con_valores_invalidos_responde_422[existe True/False x 3]`; esquema: `test_schemas::test_seccion_modificar_rechaza_valores_invalidos`, `..._hereda_las_reglas_de_seccion_crear` | OK |
| Modificar: nombre repetido de otra sección (409) | `R::test_modificar_seccion_con_nombre_de_otra_responde_409`; pantalla: «muestra el 409 de nombre y el de posición bajo su campo (CA 2)» | OK |
| Modificar: mismo nombre con otra capitalización (200) | `R::test_modificar_seccion_solo_la_capitalizacion_responde_200` | OK |
| Modificar: orden ocupado (409) | `R::test_modificar_seccion_con_orden_ocupado_responde_409`; carrera: `test_service::test_modificar_seccion_convierte_la_carrera_de_orden_en_conflicto` | OK |
| Modificar: orden de una deshabilitada (200) | `R::test_modificar_seccion_deshabilitada_acepta_orden_de_otra_deshabilitada` | OK |
| Modificar: guardar sin cambios (200) | `R::test_modificar_seccion_sin_cambios_responde_200` | OK |
| Agregar productos habilitados (con traslado confirmado) | `R::test_modificar_seccion_agrega_productos_con_confirmacion`; pantalla: «marca los productos que ya son de la sección (CA 3)», «confirma el traslado de los nuevos sin nombrar los actuales (CA 5)» | OK |
| Agregar: producto de otra sección sin confirmar (409 con producto y sección) | `R::test_modificar_seccion_sin_confirmar_traslado_responde_409` | OK |
| Agregar: producto deshabilitado (409; el selector no lo ofrece) | `R::test_modificar_seccion_con_producto_deshabilitado_responde_409`; selector con la lista de habilitados de HU-M1-10 (`SeccionesTab` pide `estado=HABILITADO`) | OK |
| Agregar a una sección que queda deshabilitada (409) | `R::test_modificar_seccion_agregando_a_una_deshabilitada_responde_409` | OK |
| Todo producto pertenece a una sección: omitir un producto | `R::test_modificar_seccion_con_producto_ids_vacio_conserva_los_productos`, `R::test_modificar_seccion_ignora_un_producto_ya_presente` | OK |
| Todo producto pertenece a una sección: desmarcar en el diálogo | `SeccionFormDialog` «al desmarcar uno actual avisa y lo deja marcado (CA 4)» | OK |
| Reactivar: reactivación | `R::test_reactivar_seccion_responde_200_y_vuelve_a_la_carta`; pantalla: «marcada envía estado HABILITADO (CA 7)», «la casilla de habilitar aparece solo con la sección deshabilitada (CA 7)», «sin marcar omite el estado (H13)» | OK |
| Reactivar: orden ocupado (409; con orden libre, 200) | `R::test_reactivar_seccion_con_orden_ocupado_responde_409_y_sigue_deshabilitada`, `R::test_reactivar_seccion_con_orden_libre_responde_200`; pantalla: «con la posición ocupada se corrige el orden y se guarda de nuevo (CA 7)» | OK |
| Baja confirmada | `R::test_dar_de_baja_seccion_200`; `api.test` «da de baja una seccion con POST a /baja y cuerpo vacío»; `AccionesSeccion` «habilitada ofrece dar de baja y, al confirmar, notifica (CA 1)»; `useBajaSeccion` «al confirmar da de baja, avisa y notifica (CA 1)» | OK |
| Baja: los productos conservan su estado y su sección, y vuelven al reactivar | `R::test_dar_de_baja_seccion_conserva_el_estado_y_la_seccion_de_sus_productos` | OK |
| Baja de una ya deshabilitada (409) | `R::test_dar_de_baja_seccion_ya_deshabilitada_responde_409`; `AccionesSeccion` «deshabilitada ofrece editar y no dar de baja (S73)» | OK |
| Confirmar la baja: aviso con productos (0, 1 y 3) | `useBajaSeccion` `descripcionDeLaBaja` (`it.each` con 0, 1 y 3); error del servidor: «si el servidor falla avisa el error y no notifica» | OK |
| Confirmar la baja: cancelar | `useBajaSeccion` «al cancelar no envía nada (CA 4)» | OK |
| Listar: listado paginado | `R::test_listar_secciones_pagina_y_ordena_por_orden` (HU-M1-10, sin cambios de comportamiento) | OK |
| Listar: límite fuera de rango (422) | `R` parametrizada `limit` en 0 y 101 y comprobación `limit=101` | OK |
| Listar: filtro por estado habilitado | `R::test_listar_secciones_con_estado_habilitado_filtra_y_cuenta` | OK |
| Listar: estado inválido (422) | `R::test_listar_secciones_con_estado_invalido_responde_422` | OK |
| Listar: sin filtro no cambia la respuesta | `R::test_listar_secciones_sin_estado_incluye_todas` | OK |
| Listar: conteo de productos habilitados (2 de 3) | `R::test_listar_secciones_cuenta_los_productos_habilitados`; acciones por fila: `SeccionesTabla` «muestra las acciones de cada fila con renderAcciones», `SeccionesTab` «Editar abre el diálogo con la fila y sus productos habilitados», «tras dar de baja recarga solo las secciones y la fila sigue en la página» | OK |
| Reglas transversales: atomicidad (S71) y ids ya presentes (S72) | `R::test_modificar_seccion_con_falla_parcial_no_cambia_nada`, `R::test_modificar_seccion_ignora_un_producto_ya_presente` | OK |
| Método `put` compartido (H9) | `client.test` «envia JSON en las solicitudes PUT», «propaga el detalle del error de una solicitud PUT»; `api.test` «modifica una seccion con PUT y el cuerpo completo» | OK |

Resultado: 28 escenarios, ninguno `UNTESTED` ni `FAILING`.

## 4. Criterios de aceptación

| HU | CA | Cubierto por |
| --- | --- | --- |
| #15 HU-M1-11 | CA 1 | «Modificar nombre y orden», escenarios «Cambio válido» y «Guardar sin cambios» |
| | CA 2 | Escenarios «Valor inválido», «Nombre repetido», «Mismo nombre con otra capitalización», «Orden ocupado», «Orden de una deshabilitada» |
| | CA 3 | «Agregar productos habilitados» |
| | CA 4 | «Todo producto pertenece a una sección»: omitir (API) y desmarcar (diálogo); la API no ofrece quitar |
| | CA 5 | «Producto de otra sección sin confirmar» |
| | CA 6 | «Producto deshabilitado» y «Agregar a una sección que queda deshabilitada» |
| | CA 7 | «Reactivar una sección»: reactivación y orden ocupado |
| #16 HU-M1-12 | CA 1 | «Baja confirmada» |
| | CA 2 | «Aviso con productos» |
| | CA 3 | «Los productos conservan su estado» |
| | CA 4 | «Cancelar» |

## 5. Cumplimiento de Strict TDD

| Comprobación | Resultado |
| --- | --- |
| Evidencia Rojo y Verde por fase en `apply-progress.md` | Presente para las Fases 1 a 4 (30 fallas, 4, 12 y 5 de partida; 455, 320, 331 y 343 pruebas en verde). Falta la tabla con columnas Triangular y Red de seguridad: ver SUGGESTION 3 |
| Archivos de prueba existen y pasan | Sí: 455 y 343 pruebas pasan en esta verificación |
| Pruebas verdes de partida | `apply-progress.md` reconoce que los casos de 404 pasaron antes de implementar (sin ruta, Starlette responde 404) y que se verificaron después con la ruta real; ver WARNING 2 |
| Triangulación | 422 con tres entradas y dos estados de existencia; baja con 0, 1 y 3 productos (`it.each`); reactivación con orden libre y ocupado; traslado con y sin nuevos |
| Calidad de aserciones | Sin pruebas vacías ni aserciones triviales: se comprueba el código, el cuerpo (`detalle`, estado, productos) y que no cambia nada (`db.get`, `GET` posterior) |
| Capa de las pruebas | Backend: integración con `TestClient` y SQLite temporal, más unitarias de esquema y `service`. Frontend: unitarias (`api`, `client`, `descripcionDeLaBaja`) e integración con Testing Library (diálogo, acciones, pestaña, tabla) |

## 6. Coherencia con el diseño (H1 a H14)

| # | Decisión | Evidencia | Res. |
| --- | --- | --- | --- |
| H1 | `SeccionModificar(SeccionCrear)` con `estado: Estado \| None = None` | `schemas.py`; `test_seccion_modificar_*` | OK |
| H2 | Tres rutas, una línea que delega; `PUT` con JSON | `router.py`: `consultar_seccion`, `modificar_seccion`, `dar_de_baja_seccion` | OK |
| H3 | Orden: 422, 404, 409 nombre, 409 orden (solo si queda habilitada), 409 agregar a deshabilitada, 404 productos, 409 deshabilitados, 409 traslado | `service.modificar_seccion` sigue ese orden; 422 con id inexistente probado (`existe False`) | OK |
| H4 | `excluir_id` opcional en `repository`, pasado posicional por el `service` | `repository.py` y `_validar_nombre_libre`/`_validar_orden_libre`; `test_modificar_seccion_convierte_la_carrera...` con `lambda *_` y la prueba de carrera del alta siguen en verde | OK |
| H5 y H12 | Productos aditivos: solo los nuevos pasan por carga, habilitados y traslado; `seccion.productos = [*seccion.productos, *productos]`. El diálogo envía `producto_ids: nuevos` y `confirmar_traslado: nuevos.length > 0` | `service.py` (`nuevos`, `_aplicar_cambios_seccion`); `useFormularioSeccion.ts`; pruebas de ids presentes y de traslado | OK |
| H6 | Se muta tras validar todo; un solo `commit` en `_confirmar_seccion`, con `IntegrityError` a 409 y `rollback` | `service.py`; `test_modificar_seccion_con_falla_parcial_no_cambia_nada` | OK |
| H7 | Baja: 404, 409 «La sección ya está deshabilitada», `DESHABILITADO`, `commit`; no toca productos | `service.dar_de_baja_seccion`; pruebas de baja | OK |
| H8 | `productos_habilitados` con `func.count(...).filter(...)` en el listado y calculado en `_a_salida_seccion`; `cantidad_productos` se conserva | `repository.listar_secciones`, `service._a_salida_seccion`; `test_listar_secciones_cuenta_los_productos_habilitados` | OK |
| H9 | `put<T, B>` en `ClienteApi`, gemelo de `post` | `frontend/src/shared/api/client.ts` (+8 líneas) y su prueba | OK |
| H10 | El diálogo usa la fila y los productos habilitados ya cargados; sin `obtenerSeccion` en `api.ts` | `useFormularioSeccion.idsActuales`; `api.ts` solo suma `modificarSeccion` y `darDeBajaSeccion` | OK |
| H11 | El desmarcado de un producto actual no se aplica y muestra el aviso | `useSeleccionProductos.cambiarSeleccion`, `AVISO_PRODUCTO_ACTUAL`; prueba CA 4 | OK |
| H13 | Casilla «Habilitar la sección» solo con la fila `DESHABILITADO`; marcada envía `estado: 'HABILITADO'`, sin marcar lo omite; el frontend nunca envía `DESHABILITADO` | `guardarSeccion`; tipo `SeccionModificar.estado?: 'HABILITADO'`; pruebas de reactivación | OK |
| H14 | `renderAcciones` en `SeccionesTabla`; `AccionesSeccion` con «Editar» siempre y «Dar de baja» solo habilitada; `dialogo: { seccion? } \| null`; recarga solo de secciones tras la baja; `App.tsx` sin cambios | Archivos y pruebas de la Fase 4; ver SUGGESTION 1 por el texto del estado | OK |

## 7. Reglas de AGENTS.md

| Regla | Resultado |
| --- | --- |
| Capas: `router` solo delega | Las tres rutas nuevas son una línea que llama al `service`; `lint-imports` 10/10 |
| `service` sin FastAPI ni `HTTPException` | Los imports del `service` son `sqlalchemy`, `app.modules.productos`, `app.shared`; los errores son `NoEncontradoError` y `ReglaDeNegocioError` |
| Errores `{"detalle": ...}` y 404, 409, 422 | Verificado en las pruebas de 404, 409 y 422 de la sección 3 |
| Consultas parametrizadas en `repository` | `select(...).where(... != excluir_id)` y `func.count(...).filter(...)` con SQLAlchemy, sin SQL en texto |
| Sin `any` | Ningún `any` en los archivos de frontend cambiados; `eslint --max-warnings=0` correcto |
| Funciones de hasta 50 líneas y complejidad 10 | `ruff` (`max-complexity = 10`) y `eslint` (`max-lines-per-function` 50, `complexity` 10) sin hallazgos |
| Sin cambios fuera del módulo M1 salvo `shared/api/client.ts` | `git diff --name-only feature/HU-M1-07-08-09-bebida...HEAD` fuera de `modules/productos`, `tests/modules/productos` y `openspec/changes/HU-M1-11-12/` toca solo `frontend/src/shared/api/client.ts` y `client.test.ts` (§9.3, ya anotado en las notas del PR) |
| Sin cambios en CI ni lint | Sin diffs en `.github/`, `backend/pyproject.toml` ni `frontend/eslint.config.js` |
| Sin migraciones | Sin archivos nuevos en `backend/alembic/`; una sola cabeza |
| Tamaño de revisión | Backend 539 líneas (522 agregadas, 17 quitadas) y frontend 1089 (971 y 118), medidos con `git diff --shortstat` y coincidentes con `apply-progress.md`. El frontend supera el punto de control de 800: nota de checkpoint, no una falla (AGENTS.md §4); el PR es único |

## 8. Hallazgos

### CRITICAL

Ninguno.

### WARNING

1. **El frontend supera el punto de control de revisión.** 1089 líneas cambiadas contra 800 (pronóstico ≈ 520). Se registra como nota de checkpoint: AGENTS.md §4 lo define como punto de control y no como bloqueo, y la HU no se divide en varios PR. Conviene que quien revise lo sepa (ya consta en las notas del PR).
2. **Casos de 404 en verde antes de implementar.** En la Fase 1 los casos de 404 de las rutas nuevas pasaron sin código (Starlette responde 404 ante una ruta ausente), así que no distinguían «ruta ausente» de «sección inexistente» en el paso Rojo. `apply-progress.md` lo reconoce y los casos se verificaron después con la ruta real; hoy discriminan, porque comprueban que `detalle` menciona el id (`"999" in detalle`). Sin impacto en el resultado.

### SUGGESTION

1. **Texto del estado en la tabla.** La tarea 4.3 dice «Deshabilitado» y la tabla muestra «Deshabilitada» (texto vigente de `SeccionesTabla`); `apply-progress.md` lo documenta. Corregir el texto de la tarea 4.3 si se quiere que el artefacto refleje el código.
2. **Cobertura del frontend.** `coverage.include` limita la métrica a `src/App.tsx` y `src/shared/**`, de modo que los archivos de `modules/productos/` no entran en el 72,44 %. No es un defecto de este cambio ni se debe tocar acá (AGENTS.md §9.8); conviene plantearlo al equipo, como ya se señaló en la verificación de HU-M1-07-08-09.
3. **Formato de la evidencia TDD.** `apply-progress.md` resume Rojo y Verde por fase, sin las columnas Triangular y Red de seguridad por tarea. La evidencia es verificable (las pruebas existen y pasan), pero no sigue la tabla por tarea del módulo Strict TDD.

## 9. Veredicto

**PASS WITH WARNINGS.** La CI completa pasa (backend 455 pruebas, frontend 343), no hay tareas pendientes, los 28 escenarios y los 11 criterios de aceptación de #15 y #16 tienen una prueba que pasa, las decisiones H1 a H14 están implementadas como se escribieron y se cumplen las reglas de AGENTS.md (solo `shared/api/client.ts` y su prueba salen del módulo M1). Los dos WARNING son de proceso (tamaño del frontend sobre el punto de control y pruebas de 404 verdes de partida) y no bloquean el archivado.
