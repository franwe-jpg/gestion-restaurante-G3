```yaml
schema: gentle-ai.verify-result/v1
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 14/14
scenarios: 49/49
test_command: "backend: pytest (con ruff, lint-imports) | frontend: npm run test:coverage"
test_exit_code: 0
test_output_hash: sha256:083719ef91698acb8b977a0c6993242213c9309452605a39554145489ec51883
build_command: "frontend: npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build"
build_exit_code: 0
```

# Informe de verificación: HU-M1-05-06 (HU-M1-05 y HU-M1-06)

- **Veredicto: PASS WITH WARNINGS** (0 CRITICAL, 3 WARNING, 3 SUGGESTION)
- **Cambio:** `HU-M1-05-06` · **Rama:** `feature/HU-M1-05-06-modificar-baja-postre` (4 commits sobre `develop`: `da05568`, `06002e6`, `958d726`, `c6a85c2`) · **Modo:** Strict TDD · **Persistencia:** OpenSpec.
- **Alcance verificado:** HU-M1-05 (#7) CA 1 a 5 y HU-M1-06 (#8) CA 1 a 4. Spec: 14 requisitos (11 agregados, 3 modificados) y 49 escenarios.
- Nota: `test_output_hash` es el SHA-256 de las últimas tres líneas de la salida de `pytest -q` de esta verificación.

## 1. Completitud de tareas

`tasks.md`: 26 tareas marcadas `[x]`, 0 pendientes (fases 1 a 4). Coinciden con los commits de `apply-progress.md`. Árbol de trabajo limpio.

## 2. Ejecución de la CI (AGENTS.md §7)

| Lado | Comando | Resultado |
| --- | --- | --- |
| Backend | `ruff check . && ruff format --check . && lint-imports && pytest` | Exit 0: `All checks passed!`, `69 files already formatted`, 10 contratos cumplidos y 0 rotos, `351 passed`, cobertura 99,30 % (umbral 70 %) |
| Frontend | `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` | Exit 0: lint con 0 errores y 0 advertencias, Prettier correcto, `tsc --noEmit` correcto, 27 archivos y `263 passed`, cobertura 72,38 % sentencias / 69,37 % ramas / 69,23 % funciones / 74,57 % líneas (umbral 60 %), build correcto |

## 3. Trazabilidad (escenario, prueba, resultado)

Archivos: backend `backend/tests/modules/productos/{test_router,test_schemas}.py`; frontend `frontend/src/modules/productos/{api.test.ts,categorias.test.ts}`, `components/AccionesProducto.test.tsx`, `pages/ProductoEditarPage.test.tsx` y `frontend/src/App.test.tsx`. Resultado: 40 COMPLIANT directos, 9 COMPLIANT por código compartido (ver WARNING 1 y 2).

| Requisito y escenario | Prueba | Res. |
| --- | --- | --- |
| Consultar: postre existente | `test_consultar_postre_existente` | OK |
| Consultar: id inexistente o de otra categoría | `test_postre_inexistente_404_en_las_tres_operaciones`, `test_postre_con_id_de_plato_404[consultar]` | OK |
| Un postre no se consulta como plato | `test_consultar_plato_de_otra_categoria_404`, `test_modificar_plato_de_postre_404`, `test_dar_de_baja_plato_de_postre_404` | OK |
| Formulario cargado | `ProductoEditarPage.test` «muestra los datos del postre con «Editar postre»», «muestra «Cargando postre...»»; `App.test` «monta la pantalla de edición de POSTRE» | OK |
| CA 1 (HU-M1-05): cambio válido | `test_modificar_postre_datos_validos` | OK |
| CA 1: guardar sin cambiar el nombre | `test_modificar_postre_datos_validos` (el nombre se conserva); regla compartida: `test_modificar_plato_mismo_nombre_200` | OK (W1) |
| CA 1: modificación desde la pantalla | `ProductoEditarPage.test` «guarda con la categoría POSTRE, avisa y vuelve a «Productos»»; `api.test` «modifica con una sola solicitud multipart PUT…» (POSTRE) | OK |
| CA 2: agregar y quitar ingredientes y etiquetas | `test_modificar_postre_ingredientes_etiquetas_e_imagen` | OK |
| CA 2: imagen reemplazada | `test_modificar_postre_ingredientes_etiquetas_e_imagen` (URL nueva servida, anterior 404) | OK |
| CA 2: imagen conservada, quitada, quitar y reemplazar 422 | Solo con platos: `test_modificar_plato_imagen_conservada/_quitada/_quitar_y_reemplazar_422` (mismo `service`) | OK (W1) |
| CA 2: cambios en el formulario | Solo con platos: `ProductoEditarPage.test` «envía los chips cambiados y la imagen quitada» | OK (W2) |
| CA 3: precio inválido, ingredientes vacíos | `test_modificar_postre_datos_invalidos_422[precio-cero, precio-texto, sin-ingredientes]`; `test_postre_modificar_exige_ingredientes` | OK |
| CA 3: nombre vacío o largo, etiquetas, descripción | Herencia de `PostreCrear` (`test_postre_modificar_hereda_categoria_mensaje_y_tipo_base`); reglas: `test_modificar_plato_*_422` | OK (W1) |
| CA 3: imagen inválida | Solo con platos: `test_modificar_plato_imagen_invalida_422` | OK (W1) |
| CA 3: nombre duplicado (incluye deshabilitado, mensaje «El postre ya está registrado») | `test_modificar_postre_nombre_duplicado_409` | OK |
| CA 3: mismo nombre que un plato | `test_modificar_postre_mismo_nombre_que_plato_200` | OK |
| CA 3: sección inexistente o deshabilitada | Solo con platos: `test_modificar_plato_seccion_inexistente_404`, `..._seccion_deshabilitada_409` | OK (W1) |
| CA 3: error indicado en el formulario, 409 en el formulario | Solo con platos: `ProductoEditarPage.test` «con errores locales…», «muestra el 409…» | OK (W2) |
| Atomicidad: falla el commit | Solo con platos: `test_modificar_producto_commit_fallido_conserva_imagen_anterior` y afines | OK (W1) |
| CA 4: el postre conserva su identidad | `test_modificar_postre_conserva_identidad` | OK |
| CA 5: reactivación | `test_modificar_postre_reactivar_200` | OK |
| CA 5: reactivar en sección deshabilitada, estado inválido | Solo con platos: `test_modificar_plato_reactivar_en_seccion_deshabilitada_200`, `..._estado_invalido_422` | OK (W1) |
| CA 5: reactivar desde el formulario | Solo con platos: `ProductoEditarPage.test` «reactiva un plato deshabilitado…» | OK (W2) |
| HU-M1-06 CA 1: baja confirmada | `test_dar_de_baja_postre_200` | OK |
| CA 1: ya deshabilitado 409 | `test_dar_de_baja_postre_ya_deshabilitado_409` | OK |
| CA 1: inexistente u otra categoría 404 | `test_postre_inexistente_404_en_las_tres_operaciones`, `test_postre_con_id_de_plato_404[baja]` | OK |
| CA 1: usado por otra tabla | `test_dar_de_baja_postre_usado_por_otra_tabla_200` | OK |
| CA 1: baja desde la pantalla | `ProductoEditarPage.test` «da de baja tras confirmar, avisa y vuelve» (postres) | OK |
| CA 2: cancelar la confirmación | `AccionesProducto.test` «al cancelar no envía nada ni notifica» (POSTRE); pantalla: solo con platos (W2) | OK |
| CA 3: datos intactos tras la baja | `test_dar_de_baja_postre_conserva_datos_e_imagen` | OK |
| CA 3: filas relacionadas intactas | `test_dar_de_baja_postre_usado_por_otra_tabla_200` | OK |
| CA 4: postre deshabilitado consultable | `test_dar_de_baja_postre_conserva_datos_e_imagen` (`GET` tras la baja con `DESHABILITADO`) | OK |
| CA 4: aparece en el filtro Deshabilitados | `test_reactivar_postre_tras_la_baja_200` (`?estado=DESHABILITADO` total 1) | OK |
| CA 4: pantalla de edición de un postre deshabilitado | `ProductoEditarPage.test` «un postre deshabilitado no ofrece «Dar de baja» y tiene el interruptor apagado» | OK |
| CA 4: reactivar desde la lista filtrada | Tramos: `AccionesProducto.test` (enlace a `/productos/postres/:id/editar`), `test_reactivar_postre_tras_la_baja_200`; sin prueba del recorrido unido (W3) | OK (W3) |
| Enlace de editar: plato, postre | `AccionesProducto.test` «ofrece editar con un enlace…» (`describe.each` PLATO y POSTRE), `categorias.test` (`rutaDeEdicion`) | OK |
| Enlace de editar: bebidas sin acciones | `AccionesProducto.test` «una fila BEBIDA no ofrece acciones» | OK |
| Baja desde la fila: postre, cancelar, deshabilitado sin «Dar de baja», plato sin cambios | `AccionesProducto.test` («al confirmar da de baja, avisa y notifica (S28)», «al cancelar…», «deshabilitado ofrece editar y no dar de baja»), `api.test` (POST `/postres/{id}/baja`), `categorias.test` «el postre tiene sus textos de edición (S32)» | OK |
| Regresión de platos y postres | 351 pruebas de backend y 263 de frontend en verde; las pruebas de platos no cambian salvo parámetros (`ruta`, `describe.each`) | OK |

## 4. Criterios de aceptación

| HU | CA | Cubierto por |
| --- | --- | --- |
| #7 HU-M1-05 | CA 1 a 5 | Requisitos «Modificar los datos», «Modificar ingredientes, etiquetas e imagen», «Reglas de validación», «Facturas conservan el precio», «Reactivar un postre deshabilitado» |
| #8 HU-M1-06 | CA 1 a 4 | Requisitos «Dar de baja un postre», «Cancelar la baja», «La baja conserva los datos», «Reactivar un postre dado de baja» |

## 5. Coherencia con el diseño (F1 a F9)

| # | Decisión | Evidencia | Res. |
| --- | --- | --- | --- |
| F1 | `PostreModificar(PostreCrear, ProductoModificar)` sin cuerpo | `schemas.py`; `test_postre_modificar_*`, `test_modificar_rechaza_categoria_enviada[PostreModificar]` | OK |
| F2 | Tres rutas explícitas en `router`, una línea que delega, `PostreCrear.CATEGORIA` en consultar y baja | `router.py`: `consultar_postre`, `modificar_postre`, `dar_de_baja_postre` | OK |
| F3 | `CategoriaEdicion = Extract<CategoriaAlta, 'PLATO' \| 'POSTRE'>`; guarda derivada de `CONFIGURACIONES_EDICION` | `categorias.ts` | OK |
| F4 | `rutaDeEdicion` sobre `SEGMENTOS_RUTA` | `categorias.ts`, `AccionesProducto.tsx` | OK |
| F5 | Textos S32 y campo `cargando` | `CONFIGURACIONES_EDICION.POSTRE`; `ProductoEditarPage.tsx` usa `configuracion.cargando` | OK |
| F6 | Ruta `productos/postres/:id/editar` | `App.tsx`, `App.test.tsx` | OK |
| F7 | `AccionesProducto` usa `rutaDeEdicion`; bebidas sin acciones | `AccionesProducto.tsx` | OK |
| F8 | Pruebas de backend: bloque nuevo de postres, `ruta` parametrizada, 404 por id de plato parametrizado | `test_router.py` líneas 1235 a 1500 | OK |
| F9 | `it.each` / `describe.each` en `categorias`, `api`, `AccionesProducto`, `App`; `describe` de postres en `ProductoEditarPage.test` | Pruebas del frontend | OK |

Sin desvíos del diseño. `service`, `repository`, `models`, `shared/` y migraciones no cambian.

## 6. Reglas de AGENTS.md

| Regla | Resultado |
| --- | --- |
| Capas: `router` solo delega | Las tres rutas nuevas son una línea que llama al `service`; `lint-imports` 10/10 |
| Errores `{"detalle": ...}` y 404, 409, 422 | Verificado en `test_modificar_postre_nombre_duplicado_409`, `test_dar_de_baja_postre_ya_deshabilitado_409` y los 404 |
| Sin `any` | Ningún `any` en los archivos cambiados; `eslint --max-warnings=0` correcto |
| Funciones de hasta 50 líneas y complejidad 10 | `ruff` y `eslint` (reglas de RNF-MAN-05) sin hallazgos |
| Sin cambios fuera del módulo M1 salvo `App.tsx` | `git diff develop...HEAD` toca `backend/app/modules/productos/`, `backend/tests/modules/productos/`, `frontend/src/modules/productos/`, `frontend/src/App.tsx`, `frontend/src/App.test.tsx` y `openspec/`. Una sola ruta en `App.tsx` (más su prueba) |
| Sin cambios en CI ni lint | Sin diffs en `.github/`, `backend/pyproject.toml` ni `frontend/eslint.config.js` |
| Sin migraciones | Sin archivos nuevos en `backend/alembic/`; el `apply-progress` registra una sola cabeza (`c4e6a8b0d2f4`) |

## 7. Hallazgos

### CRITICAL

Ninguno.

### WARNING

1. **Escenarios de backend del postre cubiertos solo por las pruebas de platos.** Imagen conservada, quitada y «quitar y reemplazar» (422), imagen inválida, nombre vacío o largo, etiquetas y descripción inválidas, sección inexistente o deshabilitada, estado inválido, reactivar en sección deshabilitada, mismo nombre propio y falla del `commit` no tienen prueba con `/postres`. Pasan por el mismo `service` genérico y por `datos_de(PostreModificar)`, y F8 acepta esta decisión de forma explícita. Riesgo: un cambio futuro de cableado específico del postre no lo detectarían estas pruebas.
2. **Escenarios de pantalla del postre cubiertos solo con el plato.** Cambios de chips e imagen, errores locales, 409 de nombre bajo el campo, reactivar desde el formulario y cancelar el diálogo de baja se prueban en `ProductoEditarPage.test` con `categoria="PLATO"`. El componente no tiene lógica por categoría distinta de la configuración (F9), que sí se prueba para postres.
3. **Sin prueba del recorrido unido «Reactivar desde la lista filtrada».** Cada tramo pasa por separado (enlace de la fila, `PUT` con `estado`, filtros de la lista), pero ninguna prueba encadena filtro, edición y regreso a «Productos». Mismo criterio que el WARNING 1 de HU-M1-02-03-13.

### SUGGESTION

1. Agregar una prueba parametrizada mínima por categoría (plato y postre) para imagen quitada y falla del `commit`, si el equipo prefiere detectar regresiones de cableado.
2. Agregar en `ProductoEditarPage.test` un caso de reactivación de un postre deshabilitado, para cerrar el escenario «Reactivar desde el formulario» con su categoría.
3. `apply-progress.md` registra la fase 4 como «commit `docs:` de los artefactos»; conviene anotar su hash (`c6a85c2`) al archivar.

## 8. Veredicto

**PASS WITH WARNINGS.** La CI completa pasa (backend 351 pruebas, frontend 263), no hay tareas pendientes ni desvíos del diseño, y ningún criterio de aceptación de #7 y #8 queda sin prueba. Los tres WARNING son de profundidad de cobertura por categoría y no bloquean el archivado.
