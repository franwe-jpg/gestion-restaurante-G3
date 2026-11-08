# Apply progress: HU-M4-06 — Anular Comanda

## Resultado

Aplicación parcial. El servicio público M6 `pagos.service.esta_facturada(db, comanda_id) -> bool` ya existe en esta rama y delega únicamente en `pagos.repository.existe_factura_de_comanda`. M4 continúa consumiendo solo ese servicio público y mantiene el fail-closed si la función no está disponible en el runtime desplegado.

## Integración M6

- La consulta pública nueva solo delega en `repository.existe_factura_de_comanda`; no se modificó repositorio, modelos, router, schemas, migraciones ni otros comportamientos M6.
- M4 resuelve de forma perezosa solo `app.modules.pagos.service.esta_facturada`; si no existe/no es callable, devuelve `ReglaDeNegocioError` antes de mutar Comanda/Mesa. Con el método disponible, llama `(db, comanda_id)`.
- M6 unit tests cubren ausencia de Factura (`False`) y presencia con estado ADEUDADA/PAGADA (`True`). M4 ahora tiene pruebas integración usando servicio M6 real; las pruebas fake previas y el fail-closed cuando se elimina el método siguen presentes.
- El método existe en esta rama, pero deberá estar disponible en el despliegue compartido para que el flujo opere en runtime.

## Riesgo aceptado

El usuario aceptó la carrera entre consulta de factura y anulación. Se difiere al sprint siguiente; no se añadieron locks, timers, retries, serialización ni bloqueos pesimistas.

## Contrato HTTP

Contrato HTTP M4 confirmado contra el router y las pruebas: `POST /api/v1/comandas/{comanda_id}/anular`, sin cuerpo, `200 ComandaSalida`; errores `404`/`409`/`422` con `detalle` mediante manejadores compartidos. S2-01 define DTO/doble, no rutas, y no se modificó. Pruebas HTTP cubren éxito con fake M6, M6 ausente y factura existente.

## Frontend

- API M4 usa `clienteHttp` y `POST /comandas/{id}/anular`.
- La tabla ofrece “Anular comanda” solo en ABIERTA. `useConfirm`/`ConfirmProvider` compartido implementa confirmación; cancelar no llama la API. Resultado muestra mensaje, y éxito/error recarga el listado existente sin retirar intencionalmente el registro histórico.
- Strict TDD escribió primero tres pruebas de página. RED: 3 fallas porque la acción aún no existía. GREEN: 21/21 pruebas de `AtencionPage.test.tsx` pasan.
- Prueba adicional de API valida ruta y propagación de respuesta.

## TDD Cycle Evidence

| Tarea | Prueba | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|
| Servicio de anulación | `backend/tests/modules/atencion/test_service.py` | No ejecutada antes de edición | Confirmado: 6 fallas por ausencia de `anular_comanda` | 6 pasan | 6 casos (éxito, dependencia ausente, facturada, dos estados no elegibles, rollback) | Ruff/types arreglados; pruebas permanecen verdes |
| Endpoint HTTP | `backend/tests/modules/atencion/test_router.py` | No ejecutada antes del wiring inicial | El wiring existía antes del test; luego se retiró temporalmente solo la función de ruta: 3 fallos, cada respuesta 404 en vez de 200/409 | Restaurada la misma función: 3 pasan | éxito/falta M6/facturada | No se cambió la implementación |
| Interfaz frontend | `frontend/src/modules/atencion/pages/AtencionPage.test.tsx` | No ejecutada antes de editar el test | 3 fallas: falta de acción UI | 21 pasan | cancelación, éxito refresca, error informa y refresca | No hubo refactor adicional |
| API frontend | `frontend/src/modules/atencion/api.test.ts` | No ejecutada antes del wiring inicial | El wiring existía antes del test; luego se retiró temporalmente solo `anularComanda`: `TypeError: api.anularComanda is not a function`, 1 falló | Restaurada la misma función: 1 pasó, 8 omitidas por filtro | ruta y propagación respuesta | No se cambió la implementación |
| Contrato público M6 | `backend/tests/modules/pagos/test_service.py` | El safety run de todo el archivo expiró tras 9/22 tests; no reporta fallas de aserción | 3 fallos por `AttributeError: ... has no attribute 'esta_facturada'` | 3 pasan; ausencia=False y ADEUDADA/PAGADA=True | Los dos estados se prueban parametrizados | Wrapper mínimo delega al repository |
| Integración M4 con M6 real | `backend/tests/modules/atencion/test_service.py` | 9 pruebas M4 previas pasaron antes de agregar casos | Con el wrapper M6 temporalmente ausente, 3 fallan por servicio no disponible (incluye ambos estados de Factura) | Restaurado wrapper, 3 pasan con servicio M6 real | No facturada/libera Mesa; ADEUDADA y PAGADA rechazan y conservan estado/Mesa | No se modificó producción M4 |

El wiring inicial de API y router precedió sus respectivas pruebas en un batch anterior; la evidencia RED/GREEN de esa continuación se conserva sin atribuirle cronología test-first. En esta fase el test M6 precedió al wrapper y el test integración M4 precedió cualquier ajuste a producción M4 (ninguno fue necesario). El safety run de `backend/tests/modules/pagos/test_service.py` expiró, descrito abajo.

## Work Unit Evidence

| Evidencia | Resultado |
|---|---|
| Prueba enfocada backend | `cd backend && ./.venv/bin/pytest tests/modules/atencion/test_service.py tests/modules/atencion/test_router.py -k anular --no-cov`: 9 passed, 147 deselected. |
| Prueba enfocada M6 | `cd backend && ./.venv/bin/pytest tests/modules/pagos/test_service.py -k esta_facturada --no-cov`: 3 passed, 22 deselected. |
| Prueba enfocada M4 con M6 real | `cd backend && ./.venv/bin/pytest tests/modules/atencion/test_service.py tests/modules/atencion/test_router.py -k anular --no-cov`: 12 passed, 147 deselected (incluye integración real ADEUDADA/PAGADA y Mesa). |
| Safety net M6 | `./.venv/bin/pytest tests/modules/pagos/test_service.py --no-cov` expiró a los 180 s tras 9/22 tests; no se reportó fallo de aserción. |
| RED/GREEN router repetido | Desde `backend/`: `./.venv/bin/pytest tests/modules/atencion/test_router.py -k anular_comanda -q --no-cov`; con solo la función de ruta retirada temporalmente: 3 failed (404 en vez de 200/409); restaurada: 3 passed, 92 deselected. |
| RED/GREEN API repetido | Desde `frontend/`: `npm test -- src/modules/atencion/api.test.ts -t 'anula por POST de acción'`; sin solo `anularComanda`: 1 failed por `TypeError: api.anularComanda is not a function`; restaurada: 1 passed, 8 skipped. |
| Historial | `pytest tests/modules/atencion/test_router.py -k anular_comanda_no_facturada --no-cov`: 1 passed; la prueba consulta el GET existente filtrado por `ANULADA` y encuentra el mismo ID. |
| Ejecución amplia de archivos M4 | `pytest tests/modules/atencion/test_service.py tests/modules/atencion/test_router.py --no-cov` superó timeouts 120 s y 300 s; el comando fue detenido con progreso de 21% (33/156 aprox.). No se interpreta como suite completada ni como fallo de aserciones. |
| Calidad/imports backend | `ruff check` pasó; `ruff format --check` pasó para los 3 archivos afectados; `lint-imports`: 10 kept, 0 broken. |
| Pruebas enfocadas frontend | `npm test -- --run src/modules/atencion/api.test.ts src/modules/atencion/pages/AtencionPage.test.tsx`: 30 passed en 2 archivos. |
| Calidad frontend | ESLint focalizado pasó; Prettier check focalizado pasó tras format dirigido; `npm run typecheck` pasó. |
| Harness runtime | Prueba de servicio M4 con sesión SQLite y servicio M6 real confirma transición/Mesa; las pruebas fake continúan cubriendo ausencia de dependencia. |
| Límite de reversión | Revertir archivos M4 atencion de backend/frontend, wrapper más prueba focalizada M6 y artefactos HU-M4-06; no hay migración ni cambio de M3. |

## Estado

Parcial. M6 wrapper, servicio/router M4 y frontend pasan sus pruebas focalizadas; el servicio M4 se verifica contra M6 real localmente. La suite de test_service M6 y la corrida backend amplia previa expiraron y no se consideran aprobadas. Falta garantizar el despliegue compartido del método M6. La carrera entre consulta y anulación sigue aceptada y diferida al siguiente sprint. El contrato HTTP M4 quedó confirmado en la spec; S2-01 no define rutas y no se modificó. No se modificó M3 ni el backup.
