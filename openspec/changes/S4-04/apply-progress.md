# Progreso de implementación: S4-04

## Estado

- Modo: Strict TDD (`strict_tdd: true`).
- Entrega: un PR con `size:exception` aprobado; justificación documentada en `tasks.md` conforme a AGENTS.md, sección 4.
- Ejecución: Build directo autorizado tras el error de preflight del dispatcher; no se volvió a delegar ni a invocar `/sdd-apply`.
- Alcance implementado: backend M3/M4 y etapa frontend 3.1–3.6.
- Tareas completas: 24/24. La persona responsable de S2-01 autorizó explícitamente la extensión del contrato; la compatibilidad fue confirmada con inspección y pruebas focalizadas.
- `backend/.venv/bin/pytest` disponible. No se ejecutaron suites completas ni cobertura global.
- No se modificó ni duplicó la migración de `mozo_id`; la columna existente sigue nullable.

## Evidencia de ciclos TDD

| Tarea | Prueba primero / RED | GREEN focalizado | Triangulación | Refactor |
|---|---|---|---|---|
| 1.1–1.2 | `test_schemas.py`: 2 RED reales (campo requerido y proyección nullable ausentes), con 40 pruebas previas pasando | `test_schemas.py`: 42 passed tras actualizar `comanda.py` | Alta con mozo requerido, rechazo de ausencia/0 e histórico NULL | Declaración de tipos simple; Ruff/format check posterior |
| 2.1–2.2 | 3 casos de validación fallaron por ausencia de `validar_mozo_habilitado`; búsqueda falló por falta de argumento `q` | `test_mozo_service.py` y `test_mozo_router.py`: 61 passed | Mozo habilitado, inexistente, deshabilitado; estado, orden y página | Funciones cortas, Ruff validó complejidad e imports |
| 2.3–2.4 | El primer filtro HTTP falló al incluir un mozo habilitado que no coincidía con la búsqueda | Suite enfocada M3: 61 passed | Nombre, habilitación, límite/offset y total filtrado | Query parametrizada existente; formato validado |
| 2.5–2.6 | Tests M4 fallaron por falta del puerto; POST con mozo inexistente/deshabilitado respondía 201 antes de validación | M4 dirigido: 83 passed en contratos, schemas, alta, servicio y flujo desde reserva; 5 pruebas HTTP enfocadas pasaron | Alta válida, omisión 422, inexistente 404, deshabilitado 409, sin insertar/ocupar ante rechazo | Separación router/service/repository preservada |
| 2.7–2.8 | RED por operación/route ausentes; caso HTTP histórico devolvía 404 por no existir la ruta | `test_mozo_comanda.py`: 7 passed; 5 pruebas HTTP enfocadas pasaron | Asignación, corrección, comanda inexistente, mozo inválido/deshabilitado, sin mutación y log | Se dejó el log con valores anteriores/nuevos en mensaje y campos estructurados |
| 2.9–2.10 | La prueba de resumen falló porque `mozo_id` no aparecía en la serialización; listado no exponía el id | `test_schemas.py`: 42 passed; ruta/listado incluido en pruebas HTTP enfocadas | Comanda asignada y dato histórico nullable | Sin consulta directa M4→repository/model/schema de M3 |

Los fallos iniciales de llamadas de prueba con paths relativos desde la raíz y el timeout de una corrida amplia de baseline no se trataron como RED funcional. Las pruebas se repitieron desde `backend/` con paths válidos y comandos enfocados.

## Evidencia de integración y controles

| Evidencia | Resultado |
|---|---|
| Backend M4, schemas/alta/corrección/reserva | `pytest -o addopts='' tests/modules/atencion/test_schemas.py tests/modules/atencion/test_alta.py tests/modules/atencion/test_mozo_comanda.py tests/modules/atencion/test_comanda_para_reserva.py -q` → 83 passed |
| Rutas M4 de alta/listado/asignación | `pytest -o addopts='' tests/modules/atencion/test_router.py -k 'crear_comanda_con_mesa_y_catalogo_reales_ocupa_la_mesa or crear_comanda_sin_mozo or crear_comanda_mozo_inexistente or crear_comanda_mozo_deshabilitado or asignar_mozo_a_comanda_historica' -q` → 5 passed |
| Contrato S2-01 y consumidor M6 | `pytest -o addopts='' tests/shared/test_contrato_comanda.py tests/modules/pagos/test_facturas.py::test_previsualizar_factura_de_comanda_con_promocion_conserva_el_descuento -q` → 49 passed |
| Flujo local/adapter | `test_finalizar_promocion_no_cambia_la_comanda_ya_cotizada` y `test_alta_http_con_dobles_solo_de_prueba_y_a01` → 2 passed |
| M2/M6 y cambios S4-02/S4-03 | Los cambios de S4-02 afectan cotización/promociones; S4-03 es frontend-only. No hay consumidor productivo M2 que construya `ComandaCrear`; M4 y M6 mantienen compatibilidad con el campo nuevo. Tests dirigidos de adaptadores/M6 pasan (19 passed) |
| Import contracts | `lint-imports` → 10 kept, 0 broken; M4 solo usa el service público de M3 |
| Calidad Python | Ruff check pasó; Ruff format check pasó en 23 archivos backend tocados |
| Runtime/UI frontend | No se ejecutó E2E (no está disponible); pruebas Vitest focalizadas abajo |
| Migración/datos | No se creó migración; no hay backfill. Los outputs conservan `mozo_id=None` para históricos |

## Pendiente

- No quedan tareas de implementación pendientes (24/24). La fase diagnóstica `/sdd-verify` es opcional y no se ejecutó en esta solicitud.
- Suites globales/coverage no ejecutadas por instrucción del usuario.

## Corrección focalizada de fixtures de M4

- Se actualizó únicamente `backend/tests/modules/atencion/test_router.py::_abrir_comanda` para incluir `mozo_id=salon.mozo_id`; no se cambió código productivo ni se hizo relajación del contrato.
- Comando: `./.venv/bin/pytest --no-cov tests/modules/atencion/test_router.py::test_cerrar_comanda_con_salon_real_libera_la_mesa tests/modules/atencion/test_router.py::test_cerrar_comanda_permite_nueva_comanda_en_la_mesa tests/modules/atencion/test_router.py::test_cerrar_comanda_con_pendientes_deja_la_mesa_ocupada tests/modules/atencion/test_router.py::test_cerrar_comanda_dos_veces_no_libera_la_mesa_de_otra_comanda tests/modules/atencion/test_router.py::test_ciclo_entregar_todo_y_cerrar_responde_200 tests/modules/atencion/test_router.py::test_ciclo_desmarcar_una_unidad_y_cerrar_responde_409 -q`
- Resultado real: 5 passed, 1 failed. `test_cerrar_comanda_permite_nueva_comanda_en_la_mesa` abre la primera Comanda mediante el helper corregido, pero su segundo `POST /comandas` (payload local del propio test, línea 688) sigue omitiendo `mozo_id` y recibe 422 en vez de 201.
- El segundo payload es una incompatibilidad adicional del test, distinta del helper que se autorizó modificar. Queda informado; no se cambió por la restricción explícita de modificar únicamente `_abrir_comanda`.
- Seguimiento autorizado: se agregó `salon.mozo_id` únicamente al segundo payload del test señalado. `./.venv/bin/pytest --no-cov tests/modules/atencion/test_router.py::test_cerrar_comanda_permite_nueva_comanda_en_la_mesa -q` → 1 passed, 1 warning de deprecación Starlette/httpx.

## Evidencia TDD frontend (tareas 3.1–3.6)

| Tarea | Safety net | RED (prueba escrita primero y resultado) | GREEN focalizado | Triangulación | Refactor |
|---|---|---|---|---|---|
| 3.1 | `api.test.ts` baseline: 10 passed | API no enviaba `q`; hook no podía cargar resultados de búsqueda | API 13 passed; `catalogoComanda.test.ts` 7 passed; `useCatalogoComanda.test.tsx` 5 passed | Paginación de más de 100, búsqueda por nombre/apellido y manejo de error M3 | Extracción del paginador y del hook de búsqueda conservó el flujo S4-03 |
| 3.2 | Igual que 3.1; no se repitió sin cambios | — | API y hook consumen el endpoint M3; selector recibe lista paginada | Selector pide HABILITADO; tabla puede mapear también mozos deshabilitados en históricos | Ruff ESLint/Prettier/typecheck finales pasan |
| 3.3 | No se capturó baseline separado de los tests UI previos a modificar sus fixtures; las pruebas existentes se incluyen en el resultado final | RED: los controles separados no cumplían el campo único y el test exigió un combobox | `ComandaForm.test.tsx`: 14 passed | Texto no seleccionado no habilita el alta; resultado seleccionado envía su ID; 404/409 permanecen visibles | Se compone con `SearchInput`, `Button`, `FormField`, `ErrorState`, `Spinner` y `EmptyState` compartidos |
| 3.4 | Ver nota de baseline de 3.3 | — | El combobox integrado actualiza texto de búsqueda y conserva `mozo_id` solo al seleccionar una opción | Búsqueda M3 remota por `q`, estado habilitado y todas las páginas | Se reutilizó el formulario M4/S4-03; no se creó componente visual paralelo |
| 3.5 | `ComandasTabla.test.tsx` es nuevo | RED: no encontraba el nombre del mozo ni el marcador de histórico NULL | `ComandasTabla.test.tsx`: 1 passed | Mozo habilitado, deshabilitado y comanda sin asignación | Se reutiliza la tabla y los estados vacíos existentes |
| 3.6 | `AtencionPage.test.tsx`: pruebas dirigidas a listado/alta después del cambio | — | Integración dirigida de AtencionPage: 3 passed, 33 skipped por filtro de nombres | El panel obtiene el catálogo paginado; histórico NULL dice «Sin mozo asignado» y falta de nombre usa `Mozo #id` | No se añadió pantalla de corrección histórica ni componente visual paralelo |

## Evidencia frontend final

| Control | Resultado |
|---|---|
| Vitest M4 afectado (`api`, catálogo/hook, formulario y tabla) | 5 archivos, 40 passed |
| Vitest integración M4 (alta y listado, casos afectados) | 1 archivo, 3 passed; 33 omitidos por `-t` |
| ESLint en archivos frontend modificados (`--max-warnings=0`) | Passed, 0 warnings |
| Prettier en archivos frontend modificados | Passed |
| `npm run typecheck` | Passed |
| Suites globales y coverage | Omitidas según instrucción; no se ejecutó E2E |

## Diagnóstico de fallos frontend reportados

- `AtencionClientes.test.tsx` auto-mockeaba `../api` sin configurar los endpoints de mozos incorporados en S4-04. El catálogo recibía `undefined` y `primerError` fallaba al leer `exito`, produciendo un rechazo async no manejado aunque la aserción del test pasara. El test ahora configura `listarMozosHabilitados` y `listarTodosMozos` con respuestas vacías válidas; su caso aislado pasó sin errores async.
- El test de rechazo de anulación esperaba inmediatamente la segunda llamada de `listarComandas`, pero esta se dispara tras el rerender/effect de recarga. La aserción ahora espera esa llamada con `waitFor` (también actualizado el caso exitoso equivalente).
- `ComandaForm.tsx` se refactorizó para respetar los límites existentes de líneas y complejidad, sin cambiar el comportamiento del combobox.
- Ejecución final de los casos reportados en los tres archivos afectados, con `--maxWorkers=1`: **3 archivos, 4 passed, 57 omitidos por filtro**, sin rechazos async.
- Controles finales frontend: `npm run lint`, `npm run format:check`, `npm run typecheck` y `npm run build` pasaron. No se ejecutó `test:coverage` ni la suite global.

## Verificación de compatibilidad S2-01 (tarea 4.4)

- La persona responsable del contrato S2-01 autorizó su extensión en este cambio.
- `ComandaCrear.mozo_id` es requerido, estricto y positivo; ausencia/valor inválido produce 422. `ComandaResumen`/`ComandaSalida.mozo_id` permanece nullable para los históricos.
- M4 valida alta y corrección mediante el puerto adaptado al service público de M3: mozo inexistente → 404; deshabilitado → 409; no se consulta repository/model/schema de M3 desde M4.
- `GET /mozos` mantiene paginación; el filtro de estado/búsqueda no altera consumidores M2/M6. M6 lee campos existentes de Comanda y conserva compatibilidad. No se alteraron datos ni se agregó migración.
- Evidencia: `test_contrato_comanda.py`, schemas M4, M3 service/router, M4 alta/router/corrección, adaptadores y el test M6 focalizado pasaron en las corridas documentadas arriba. Una repetición de `test_mozo_service.py` + `test_mozo_router.py` se agotó a los 120 s tras 51 casos sin fallo observado; la corrida previa registrada fue 61 passed y no hubo cambios backend posteriores.
- Resultado: no se encontró incompatibilidad de producción ni fue necesario modificar código ajeno; 4.4 queda completada.

La cobertura de la Safety Net previa para varios tests UI existentes no se registró antes de editar sus archivos. Sí se ejecutaron al final todos los tests enfocados listados arriba; no se afirma una baseline previa inexistente.

## Seguimiento de fallos de CI del flujo M5→M4

- El PR #244 reportó 14 fallos de Vitest en `ReservasPage.test.tsx` y `useComandaDesdeReserva.test.tsx`. En la página, `listarMozosHabilitados` no estaba configurado en el mock de API y devolvía `undefined`; en las pruebas unitarias del hook se intentaba enviar una comanda sin seleccionar el Mozo requerido.
- Se añadió una respuesta habilitada realista al mock de página, las pruebas de envío seleccionan el mozo 31, y las expectativas del cuerpo ahora incluyen `mozo_id`. No se relajó la validación de producción.
- Reejecución enfocada de ambos archivos: `npm exec vitest -- run src/modules/reservas/pages/ReservasPage.test.tsx src/modules/reservas/components/useComandaDesdeReserva.test.tsx` → **51 passed**.
- GitHub Actions reportó los dos jobs backend como aprobados en el HEAD inspeccionado. La verificación local completa `npm run test:coverage` se interrumpió al superar 180 s y mostró timeouts adicionales fuera de esos dos archivos; no se obtuvo un resultado global de cobertura.
