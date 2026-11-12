# Informe de verificación: S4-04

## Alcance y estado observado

Verificación de `S4-04` contra proposal, cuatro specs, diseño, tareas y evidencia `apply-progress.md`. Estado declarado y observado: 24/24 tareas completas; `strict_tdd: true`. Se inspeccionaron los cambios de M3/M4, contrato compartido, selector/listado frontend y migración previa. La rama de trabajo contiene modificaciones sin commit; no se alteraron archivos de implementación ni tareas.

## Requisitos y hallazgos

| Criterio | Resultado y evidencia |
|---|---|
| Alta exige Mozo existente y habilitado; ausente 422, inexistente 404, deshabilitado 409 sin persistir | Conforme en código y pruebas existentes. `_registrar_comanda` valida por el puerto antes de insertar; `test_alta.py` y `test_mozo_comanda.py` incluidos en la ejecución focalizada satisfactoria. |
| M4 usa solo el service público de M3 | Conforme por inspección: `atencion/adaptadores.py` importa `salon.service`; no se encontraron imports de repository/model/schema M3 en M4. `apply-progress.md` registra `lint-imports`: 10 contratos conservados, 0 rotos. No se repitió lint-imports en esta fase. |
| Selector searchable, solo habilitados, API M3 paginada y componentes compartidos | Conforme por inspección de `api.ts`, `catalogoComanda.ts`, `ComandaForm.tsx`: el único campo “Mozo” es un combobox integrado, envía `q` al endpoint paginado y recupera todas las páginas habilitadas; el ID solo se fija al elegir una opción. Usa `SearchInput`/`Button` compartidos y bloquea el alta ante carga/error/vacío/sin selección. El apply-progress registra los resultados más recientes de esta corrección focalizada. |
| Mozo visible en contrato, salida y listado | Conforme por inspección y pruebas focalizadas. `mozo_id` figura en creación/salidas/listados; tabla presenta nombres mediante el catálogo, con fallback `Mozo #id`. |
| Históricos NULL legibles y sin asignación automática | Conforme por inspección y pruebas: tipos nullable, serialización de resumen/salida y etiqueta «Sin mozo asignado». No hay backfill en la migración existente ni en el flujo inspeccionado. |
| API explícita para asignación/corrección histórica y log | Conforme por inspección y prueba focalizada: `PUT /comandas/{comanda_id}/mozo`; operación unitaria valida antes de mutar, persiste y registra valores anterior/nuevo en log estructurado. |
| Migración existente solamente; sin duplicados y un solo Alembic head | La migración existente agrega `mozo_id` nullable y deja NULL los registros previos. No hay archivo de migración nuevo en los cambios observados. `alembic heads` confirmó un único head: `c3e5a7b9d1f2`. |
| Compatibilidad S2-01, M2/M3/M4/M6 y S4-02/S4-03 | `apply-progress.md` documenta autorización del responsable S2-01 y pruebas focalizadas de contrato/M6/adaptadores, además de revisión de consumidores. En esta fase no se repitieron todas esas pruebas. Compatibilidad con M3/M4 se examinó en los flujos relevantes; S4-02/S4-03 se consideraron según el registro de apply, pero no se ejecutaron sus suites completas. |
| Reserva no asigna Mozo antes de abrir Comanda | Evidencia de apply y prueba focalizada de reserva (`test_comanda_para_reserva.py`) conformes; la ruta de apertura sí exige la validación. |

No se observó una brecha funcional concreta en el contrato ni en el código productivo examinado. La verificación global queda **parcial**, no es una certificación completa: las suites M3 enfocadas agotaron el límite de ejecución dos veces en esta sesión. El registro de apply consigna un resultado previo de 61 pasadas y que no hubo cambios backend posteriores; ese resultado histórico se preserva como evidencia, no se presenta como ejecución actual. Una corrección posterior del helper `_abrir_comanda` reveló que el segundo payload directo de `test_cerrar_comanda_permite_nueva_comanda_en_la_mesa` también debía incluir `mozo_id`; ese payload de prueba fue actualizado bajo autorización explícita y el caso ahora pasa.

## Comprobaciones ejecutadas

| Comando | Resultado |
|---|---|
| `backend/.venv/bin/pytest -o addopts='' tests/modules/atencion/test_schemas.py tests/modules/atencion/test_alta.py tests/modules/atencion/test_mozo_comanda.py tests/modules/atencion/test_comanda_para_reserva.py tests/modules/atencion/test_router.py -q` | Agotó 120 s después de mostrar progreso; sin resultado final. |
| `backend/.venv/bin/pytest -o addopts='' tests/modules/atencion/test_mozo_comanda.py tests/modules/atencion/test_alta.py tests/modules/atencion/test_schemas.py -q` | **76 passed**, 1 warning de deprecación Starlette/httpx, 75.30 s. |
| `backend/.venv/bin/pytest -o addopts='' tests/modules/salon/test_mozo_service.py tests/modules/salon/test_mozo_router.py -q` | Agotó 120 s después de 54 puntos de progreso visibles; sin resultado final. No se repitió la corrida amplia. |
| `frontend: npm exec vitest -- run src/modules/atencion/api.test.ts src/modules/atencion/components/catalogoComanda.test.ts src/modules/atencion/components/useCatalogoComanda.test.tsx src/modules/atencion/components/ComandaForm.test.tsx src/modules/atencion/components/ComandasTabla.test.tsx` | **5 archivos, 36 tests pasaron**, 17.77 s. |
| `backend/.venv/bin/alembic heads` | `c3e5a7b9d1f2 (head)`; una sola cabeza. |
| Seguimiento frontend del combobox integrado: Vitest en `api.test.ts`, `catalogoComanda.test.ts`, `useCatalogoComanda.test.tsx`, `ComandaForm.test.tsx`, `ComandasTabla.test.tsx` | 5 archivos, 40 passed. `AtencionPage.test.tsx` con filtro de alta/listado: 3 passed, 33 omitidos. ESLint, Prettier y TypeScript también pasaron después de la corrección. |
| Diagnóstico de los fallos frontend reportados | El auto-mock de `AtencionClientes.test.tsx` no configuraba los nuevos endpoints de mozos: el catálogo recibía `undefined`, y `primerError` provocaba un rechazo async al leer `exito`. Se añadieron respuestas vacías válidas a ambos mocks; el test aislado pasó sin errores no manejados. |
| Recarga tras rechazo de anulación | La aserción de la segunda llamada de listado era inmediata aunque el efecto de recarga se ejecuta tras el rerender; se cambió a `waitFor`. El caso exitoso equivalente usa la misma espera. |
| Vitest final de casos reportados | 3 archivos (`AtencionClientes.test.tsx`, `ComandaForm.test.tsx`, `AtencionPage.test.tsx`), `--maxWorkers=1`: **4 passed, 57 omitidos por filtro**. Una ejecución agrupada con workers por defecto agotó el timeout en el caso de estado vacío; el caso pasó aislado y la corrida serial final pasó. |
| Controles finales frontend | `npm run lint`, `npm run format:check`, `npm run typecheck` y `npm run build`: todos pasaron. No se ejecutaron suite global, coverage ni E2E. |
| `backend/.venv/bin/pytest --no-cov tests/modules/atencion/test_router.py::test_cerrar_comanda_con_salon_real_libera_la_mesa tests/modules/atencion/test_router.py::test_cerrar_comanda_permite_nueva_comanda_en_la_mesa tests/modules/atencion/test_router.py::test_cerrar_comanda_con_pendientes_deja_la_mesa_ocupada tests/modules/atencion/test_router.py::test_cerrar_comanda_dos_veces_no_libera_la_mesa_de_otra_comanda tests/modules/atencion/test_router.py::test_ciclo_entregar_todo_y_cerrar_responde_200 tests/modules/atencion/test_router.py::test_ciclo_desmarcar_una_unidad_y_cerrar_responde_409 -q` | Corrida anterior: 5 passed, 1 falló por payload sin `mozo_id`; tras corregir ese payload, ejecución aislada de `test_cerrar_comanda_permite_nueva_comanda_en_la_mesa` → 1 passed. |
| Inspección de diff/status | Confirma los archivos modificados y que el informe era el único archivo de OpenSpec añadido para esta fase. No implica validación funcional. |

## Strict TDD y calidad de pruebas

`apply-progress.md` contiene tabla de evidencia RED/GREEN para tareas 1.1–3.6, con archivos y resultados reportados. Las pruebas focalizadas actuales confirman GREEN para contrato/alta/corrección/reserva y UI cubiertos en las corridas terminadas. No se puede confirmar RED histórico de manera independiente; la evidencia RED es la declaración del apply. La triangulación y el estado de safety-net se basan en la tabla: se advierte explícitamente que algunos tests UI modificados no tuvieron baseline previa registrada. Los tests nuevos/modificados se distribuyen principalmente en pruebas unitarias y de integración HTTP backend y componentes/API frontend; E2E no disponible según configuración. Revisión de assertions: la inspección de los tests Comanda ejecutados no encontró tautologías ni assertions sin invocar comportamiento productivo.

No se ejecutaron suites globales, cobertura, E2E ni `lint-imports` en verify. Sí se ejecutaron los controles frontend especificados arriba; no equivalen a cobertura global ni aprobación integral de CI.

## Próximo paso recomendado

Registrar la limitación de las suites M3 agotadas y los controles no repetidos al archivar; si se requiere una verificación de CI previa al PR, ejecutar las suites/checks pendientes en un entorno con tiempo suficiente. No quedan tareas de implementación pendientes según el estado 24/24.

## Key Learnings

1. La verificación focalizada de M4 pasó 76 pruebas; el seguimiento frontend del combobox pasó 40 pruebas y 3 pruebas de integración de `AtencionPage`.
2. Las dos ejecuciones de suites M3 terminaron por timeout y no prueban aprobación actual.
3. La migración existente mantiene nullable `mozo_id` y preserva nulos históricos sin backfill.
