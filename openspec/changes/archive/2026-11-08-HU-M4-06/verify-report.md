# Informe de verificación: HU-M4-06 — Anular Comanda

## Resultado

**Parcial; la verificación funcional focalizada pasó al ejecutar los selectores de servicio y router M4 por separado, además de M6 y frontend.** Un intento combinado de backend excedió 120 segundos mientras corría junto con otro proceso pytest; no se interpreta como fallo ni como resultado aprobatorio. La inspección confirma el flujo M4 y el wrapper público M6 en esta rama. No se ejecutaron suites completas, cobertura ni build, conforme al alcance solicitado.

## Requisitos y criterios revisados

| Criterio / comportamiento | Hallazgo y evidencia |
|---|---|
| Confirmación antes de ejecutar; cancelar no envía solicitud | `useAnularComanda` consume el `useConfirm` compartido; cancelar/cerrar resuelve `false` y el test frontend comprueba que no se invoca API. La guía compartida (`ComponentesPage.tsx`) muestra el patrón y `AppProviders` instala el proveedor. **Completo** — inspección y prueba frontend focalizada. |
| Anular ABIERTA no facturada; preservar datos y liberar Mesa en transacción M4 | M4 valida estado, consulta M6, marca `ANULADA`, delega liberación por M3 y confirma; revierte ante excepción. Los tests cubren transición, datos históricos, sesión secundaria y rollback. **Completo en verificación funcional focalizada** — selector de servicio M4: 9 pasaron; cubierto también por pruebas HTTP relacionadas. |
| Facturada: rechazar sin efectos e informar motivo | Tests de servicio incluyen fake y servicio M6 real; router comprueba conflicto y detalle. **Completo en verificación focalizada** — M4 service y router selectors pasaron. |
| Estado distinto de ABIERTA | Tests rechazan CERRADA/ANULADA antes de consultar M6 o liberar. **Completo en verificación focalizada** — selector de servicio M4 pasó. |
| Mantener Comanda anulada en historial | Test HTTP verifica GET filtrado por `ANULADA` y el mismo ID. **Completo en verificación focalizada** — caso incluido en el selector router M4 que pasó. |
| Sin acceso M4 a internals M6; wrapper solo en service M6 | M4 importa dinámicamente solo `app.modules.pagos.service.esta_facturada`; si falta/no es callable, falla controladamente antes de modificar Comanda/Mesa. El wrapper M6 delega en `repository.existe_factura_de_comanda`; no se encontraron imports M4 a repository/models de pagos. **Completo por inspección y selectores focalizados**. |
| Alcance M6 autorizado | Apply-progress reporta solo el wrapper M6 y su prueba; los archivos de repository, models, router y schemas no contienen el wrapper ni se reportan como cambiados. **Completo según el alcance inspeccionado y la evidencia de apply**; no se realizó revisión integral del diff. |
| Confirmación de Mesa mediante M3 | `MesasDeSalon.liberar` delega en el servicio público M3, sin commit separado; M4 conserva propiedad de la transacción. **Completo en inspección y prueba de servicio focalizada**. |

El manejo de identificador inexistente y la repetición de anulación no fueron fijados por la spec; no se eleva una expectativa adicional. El contrato M4 confirmado por implementación es `POST /api/v1/comandas/{comanda_id}/anular`, sin cuerpo, `200 ComandaSalida`; `404` por inexistencia, `409` por regla de negocio, `422` por ID no positivo, todos con `{"detalle": ...}` por los handlers compartidos. S2-01 es el contrato provisional de DTO/doble y no especifica rutas HTTP; no se modificó.

## Ejecuciones de verificación

| Comando | Resultado |
|---|---|
| Desde `backend/`: `./.venv/bin/pytest tests/modules/pagos/test_service.py -k esta_facturada --no-cov` | **PASS** — 3 passed, 22 deselected. Una advertencia deprecada de Starlette/httpx. |
| Intento combinado desde `backend/`: `./.venv/bin/pytest tests/modules/atencion/test_service.py tests/modules/atencion/test_router.py -k anular --no-cov` | **No concluyente, no fallo** — excedió 120 s al ejecutarse junto con otro proceso pytest; no se cuenta como pass ni fail. |
| Ejecución secuencial desde `backend/`: `./.venv/bin/pytest tests/modules/atencion/test_service.py -q -k anular --no-cov` | **PASS** — 9 passed, 55 deselected, 1 advertencia deprecada Starlette/httpx, 159.27 s. |
| Ejecución de router desde `backend/` en paralelo con el intento combinado previo: `./.venv/bin/pytest tests/modules/atencion/test_router.py -q -k anular --no-cov` | **PASS** — 3 passed, 92 deselected, 1 advertencia deprecada, 73.42 s. |
| Desde `frontend/`: `npm test -- --run src/modules/atencion/api.test.ts src/modules/atencion/pages/AtencionPage.test.tsx` | **PASS** — 30 passed en 2 archivos. |
| Suites completas backend y frontend | El responsable informa que las ejecutó manualmente. No se proporcionaron comandos, logs ni resultados; este informe no afirma que hayan pasado ni inventa conteos. |
| Ruff check y format check sobre archivos Python M4/M6 y sus tests relacionados | **PASS** — 6 archivos limpios y formateados. |
| ESLint focalizado y Prettier check sobre archivos frontend relacionados | **PASS** — sin errores y todos los archivos usan el formato esperado. |
| `lint-imports` | **PASS según apply-progress** — 10 kept, 0 broken. |
| `npm run typecheck` | **PASS según apply-progress**; no se repitió. |
| Archivo completo de tests M6 `backend/tests/modules/pagos/test_service.py --no-cov` | **No concluyente** — apply-progress registra timeout tras 9/22; no se considera aprobado. |
| Cobertura global y build | No ejecutados, de acuerdo con la solicitud. Las suites completas tampoco se ejecutaron por este agente; el responsable reportó ejecución manual, pero no hay evidencia de sus resultados en el workspace. |

## Strict TDD

Strict TDD está habilitado en `openspec/config.yaml`. Apply-progress contiene una tabla TDD con seis unidades (servicio M4, endpoint HTTP, interfaz, API frontend, wrapper M6 e integración M4/M6) y referencias a archivos de test existentes.

| Control | Resultado | Detalle |
|---|---|---|
| Evidencia TDD reportada | ✅ | Tabla encontrada; incluye RED/GREEN, triangulación y safety net. |
| Archivos de test presentes | ✅ | Los seis archivos/rutas referenciados existen. |
| RED verificable en esta fase | ⚠️ | La evidencia histórica se encuentra en apply-progress, pero no se reprodujo RED. No se presenta como comprobación independiente. |
| GREEN confirmado por ejecución | ✅/⚠️ | M6: 3/3; servicio M4: 9/9; router M4: 3/3; frontend: 30/30. El intento combinado no concluyente no reduce ni reemplaza resultados de los selectores separados. El archivo completo M6 y suites completas siguen sin confirmación. |
| Triangulación | ✅/⚠️ | Casos diferenciados cubren escenarios de spec. Servicio M6 y servicio M4 tienen RED→GREEN test-first. UI escribió pruebas primero. Router/API frontend inicialmente tenían wiring antes de sus pruebas; después se retiró y restauró temporalmente para demostrar RED/GREEN, desviación histórica de orden que no equivale a cronología estrictamente test-first. |
| Safety net en archivos modificados | ⚠️ | Apply-progress registra safety net no ejecutado antes de algunas modificaciones y timeout del archivo completo M6; para endpoint/API el wiring precedió al test inicial. No se infiere un safety net completo. |

**TDD:** evidencia parcial, aunque los selectores funcionales relevantes pasan. El wrapper M6 y los tests de servicio M4 siguieron RED→GREEN; las pruebas frontend se escribieron primero. El wiring de router y API frontend precedió a sus pruebas iniciales; la posterior retirada/restauración temporal mostró RED/GREEN, pero no cambia la cronología histórica ni permite afirmar test-first perfecto. Apply-progress documenta safety nets ausentes en algunas unidades y el timeout del archivo completo M6.

### Capas de prueba y calidad de aserciones

- **Unitarias:** test del wrapper M6 (3 casos), API frontend y reglas de servicio M4.
- **Integración:** M4 con servicio M6 real/sesión SQLAlchemy, TestClient HTTP y pruebas de interacción React Testing Library.
- **E2E:** ninguna; OpenSpec declara esta capa no disponible.
- Auditoría de las aserciones relacionadas leídas: verifican resultados/estado, solicitudes y efectos visibles; no se encontraron tautologías, loops fantasma ni pruebas solo de render. Las pruebas frontend de anulación cubren cancelar, éxito con conservación de fila y error informado. La ejecución parcial no permite validar GREEN actual de todos los casos M4.
- Cobertura por archivo omitida: no se ejecutó cobertura, según el límite de no correr suites/coverage global.

## Límites, dependencias y riesgos

- El wrapper M6 está integrado en la rama actual y las pruebas focalizadas M6 pasan aquí; eso **no equivale a disponibilidad en un despliegue compartido**. M4 requiere que `pagos.service.esta_facturada(db, comanda_id)` esté presente en el runtime desplegado. Mientras falte, el comportamiento inspeccionado falla cerrado antes de transicionar Comanda o liberar Mesa.
- La posibilidad de que se genere una factura entre la consulta M6 y la anulación es un **riesgo expresamente aceptado y diferido al próximo sprint**; esta HU no introduce locks ni mitigaciones concurrentes.
- La ruta/respuesta HTTP están confirmadas por el router M4 (`POST /comandas/{id}/anular`, `200 ComandaSalida`) y por el mapeo global `404`/`409`/`422` con `detalle`; S2-01 no define endpoints HTTP. No se modificó S2-01.
- Las suites completas fueron informadas como ejecutadas manualmente por el responsable, pero sus resultados no constan aquí; no se afirma PASS. El intento combinado del agente expiró bajo concurrencia y es no concluyente; los selectores M4 separados pasaron.
- Apply-progress acepta explícitamente `size:exception` para una entrega single-PR pese al pronóstico superior al umbral de revisión. Esta verificación no vuelve a medir líneas ni convierte la excepción en aprobación de PR.
- Este informe es diagnóstico de verificación; **no es aprobación de commit, PR ni despliegue**.

## Estado observado de tareas

Tasks registra sus tareas como completadas. Los criterios funcionales revisados con checks focalizados quedan **completos en esta rama**; el resultado de verificación es **parcial** porque no hay resultados registrados de las suites completas que el responsable dice haber ejecutado y el agente tuvo un timeout en el intento combinado. La protección de concurrencia permanece **diferida/pendiente** como deuda aceptada, no como mecanismo faltante de esta HU. S2-01 no es contrato HTTP; la ruta M4 quedó confirmada en esta spec. Esta verificación no modifica código ni tests. El cambio puede archivarse conservando expresamente la salvedad sobre resultados manuales no adjuntos y la deuda de concurrencia.
