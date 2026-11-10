# Tareas: HU-M4-06 — Anular Comanda

## Requisito previo bloqueante

- El usuario y el equipo autorizaron a esta HU agregar exclusivamente `pagos.service.esta_facturada(db, comanda_id) -> bool` en M6, delegando en el repositorio existente. No modificar M6 fuera de este método y su prueba; no alterar `generar_factura`, `previsualizar_factura` ni otras reglas.
- Contrato HTTP confirmado contra el router y los manejadores compartidos: `POST /api/v1/comandas/{comanda_id}/anular`, sin cuerpo, `200 ComandaSalida`; errores `404`/`409`/`422` con `detalle`. S2-01 define DTO/doble, no rutas, y no se modifica.
- Riesgo aceptado: puede generarse una factura entre la consulta y la anulación. La protección se difiere al próximo sprint; no implementar locks, timers ni otros mecanismos concurrentes en HU-M4-06.
- Forecast alto (300–460 líneas) bajo `single-pr`: el usuario aceptó explícitamente `size:exception` antes de apply.
- Estado inicial de M6: el método público aún no existía. `pagos.service.previsualizar_factura(db: Session, comanda_id: int) -> FacturaPrevia` rechaza Comandas ABIERTAS antes de consultar factura; `generar_factura(db: Session, datos: FacturaCrear) -> FacturaSalida` crea factura. `repository.existe_factura_de_comanda(db, comanda_id) -> bool` es interno; la HU agrega el wrapper público autorizado sin cambiar esos comportamientos.

## Pronóstico de carga de revisión

| Campo | Valor |
|---|---|
| Líneas modificadas estimadas | 320–500 líneas authored (backend M4/M6, frontend y pruebas; sin migración) |
| Riesgo de superar 400 líneas | Alto |
| PR encadenados recomendados | Sí por umbral de revisión |
| División sugerida | Un único PR HU-M4-06 con `size:exception` aceptada |
| Estrategia de entrega | single-pr |
| Estrategia de cadena | size-exception aceptada explícitamente por el usuario |

Decision needed before apply: No — `size:exception` aceptada por el usuario.
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

La previsión responde al límite de revisión general de 400 líneas; no divide la HU ni autoriza varios PR, en concordancia con la estrategia `single-pr`. La excepción `size:exception` fue aceptada explícitamente; el código puede avanzar solo hasta los límites seguros definidos por la dependencia M6.

### Unidades de trabajo propuestas

| Unidad | Objetivo | PR probable | Comando de prueba enfocado | Harness runtime | Límite de reversión |
|---|---|---|---|---|---|
| 1 | Servicio M4, transición y transacción conjunta con M3 | Único PR HU-M4-06 | `cd backend && pytest tests/modules/atencion/test_service.py tests/modules/atencion/test_adaptadores.py` | Prueba de integración con sesión compartida: anular y comprobar desde segunda sesión Comanda `ANULADA`, Mesa `LIBRE` | Cambios de servicio/adaptador y pruebas backend de HU-M4-06 |
| 2 | Contrato HTTP confirmado y flujo de confirmación de interfaz | Único PR HU-M4-06 | `cd backend && pytest tests/modules/atencion/test_router.py`; `cd frontend && npm test -- src/modules/atencion` | TestClient para éxito/error; interacción UI cancelar sin llamada y confirmar con llamada, error y refresco | Cambios del router/API/componentes/página y pruebas frontend de HU-M4-06 |

## Fase 1: Contratos y pruebas RED

- [x] 1.1 Verificar la firma pública real de M6 para consultar factura de una Comanda ABIERTA. El método aún no existe; documentar bloqueo sin acceso a internals.
- [x] 1.2 Confirmar contrato HTTP M4 implementado: ruta, respuesta `200 ComandaSalida` y mapeo de errores por manejadores compartidos; no modificar S2-01.
- [x] 1.3 Escribir primero pruebas RED de servicio para anular ABIERTA/no facturada, preservar fila/detalles, y rechazar estados no ABIERTA sin liberar Mesa.
- [x] 1.4 Escribir pruebas RED de transacción para rollback al fallar liberación y éxito visible desde segunda sesión.
- [x] 1.5 Escribir pruebas RED de M6 ausente/facturado; los fakes usan únicamente el contrato expresamente provisto `esta_facturada(db, comanda_id) -> bool`.
- [x] 1.6 Añadir pruebas HTTP M4 de éxito simulado, dependencia M6 no disponible y facturación existente. RED/GREEN reproducido después del wiring mediante retiro temporal de ruta (3 fallas 404) y restauración (3 pasan); 404 de inexistente usa el handler compartido ya cubierto por M4.
- [x] 1.7 Pruebas frontend cubren cancelar sin solicitud, confirmar, mostrar error y refrescar conservando la fila histórica; RED/GREEN de UI fue 3 fallas por acción ausente y 21 pruebas verdes.

## Fase 2: Servicio backend GREEN y REFACTOR

- [x] 2.1 Implementar en `backend/app/modules/atencion/service.py` validación ABIERTA, lookup perezoso y fail-closed de `pagos.service.esta_facturada`, transición lógica y liberación M3 con commit/rollback M4.
- [x] 2.2 No se requiere adaptador de M4: el contrato especificado se consume directamente mediante lookup fail-closed del service público M6; no se modificó `adaptadores.py`.
- [x] 2.3 Ejecutar las pruebas backend focalizadas de servicio y router.
- [x] 2.4 Revisar y tipar el lookup perezoso sin modificar adaptadores; no se requirió refactor adicional.

## Fase 3: HTTP backend GREEN y REFACTOR

- [x] 3.1 Añadir `POST /comandas/{comanda_id}/anular`, delegado al service, con salida `ComandaSalida`.
- [x] 3.2 Ejecutar pruebas HTTP focalizadas y confirmar éxito, dependencia ausente y factura existente.
- [x] 3.3 Revisar router/servicio; no se necesitó refactor adicional.

## Fase 4: Confirmación e integración frontend GREEN y REFACTOR

- [x] 4.1 Agregar llamada API mediante `clienteHttp` al endpoint confirmado. RED/GREEN reproducido después del wiring: retirar solo `anularComanda` produjo TypeError/1 fallo; restaurada, 1 pasó.
- [x] 4.2 Usar `useConfirm`/`ConfirmProvider` compartido; mostrar acción solo para ABIERTA y tras confirmar hacer API, comunicar resultado y recargar lista, conservando la fila sin alterar el listado.
- [x] 4.3 Ejecutar las pruebas frontend focalizadas de api y AtencionPage; cancelar, confirmar, error y refresco en GREEN.
- [x] 4.4 Revisar integración sin duplicar lógica del listado; cancelar no dispara solicitud.

## Fase 5: Verificación de aceptación y calidad

- [x] 5.1 Verificar por `GET /api/v1/comandas?estado=ANULADA` que una Comanda anulada permanece disponible en el historial, sin cambiar el listado.
- [x] 5.2 Ejecutar las pruebas backend afectadas y Ruff check/formato; no suite completa.
- [x] 5.3 Ejecutar las pruebas frontend afectadas y ESLint/Prettier/typecheck; no suite completa ni build.
- [x] 5.4 Confirmar el alcance: sin migración; no se modifica M3, no se alteran otras reglas de Facturación y no se implementa HU-M4-07.

## Fase 6: Consulta pública de facturación M6 autorizada

- [x] 6.1 Escribir primero en `backend/tests/modules/pagos/test_service.py` pruebas RED de `esta_facturada`: sin factura devuelve `False`; Factura ADEUDADA/PAGADA devuelve `True`. RED: 3 fallan con `AttributeError` por método ausente.
- [x] 6.2 Implementar en `backend/app/modules/pagos/service.py` `esta_facturada(db, comanda_id) -> bool`, delegando exclusivamente en `repository.existe_factura_de_comanda`; no modificar generación, previsualización ni otras reglas de M6. GREEN: selector M6, 3 passed.
- [x] 6.3 Añadir pruebas integración enfocadas en `backend/tests/modules/atencion/test_service.py` usando servicio M6 real para Comanda ABIERTA no facturada y Facturas ADEUDADA/PAGADA; wrapper ausente produjo 3 fallas controladas y restaurado, 3 pasaron. Se conservan los tests con fake y fail-closed.
- [x] 6.4 Ejecutar únicamente selectores M6/M4: 3 M6 y 12 M4 pasaron; Ruff check/formato y lint-imports pasan. El test file M6 ampliado expiró durante baseline y no cuenta como suite aprobada.
