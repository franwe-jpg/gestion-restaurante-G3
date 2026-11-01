# Informe de verificación: HU-M4-08 Registrar la entrega de productos de una comanda

**Veredicto: PASS WITH WARNINGS** (0 CRITICAL, 2 WARNING, 2 SUGGESTION). Modo: Strict TDD.

## Ejecución real

| Control | Resultado |
| --- | --- |
| Backend `ruff check .`, `ruff format --check .` | sin errores |
| Backend `lint-imports` | 10 contratos mantenidos, 0 rotos |
| Backend `pytest` | 1294 pasan, cobertura 99,16 % (umbral 70 %) |
| `alembic heads` | `a8c0e2b4d6f8 (head)`, cabeza única |
| Frontend `lint`, `format:check`, `typecheck` | sin errores |
| Frontend `test:coverage` | en verde; cobertura de sentencias 75,09 % (umbral 60 %) |
| Frontend `build` | correcto |

## Contrato y alcance

- `git diff origin/develop...HEAD -- backend/app/shared`: vacío; `contratos/comanda.py` no cambia.
- Archivos tocados: solo `atencion` (backend y frontend), la migración nueva y `openspec/changes/HU-M4-08/`.
- `tasks.md`: 39 casillas marcadas, 0 pendientes.
- Reglas: solo `ABIERTA` (409 en otro caso); errores 404/409/422 con `{"detalle": ...}`; `PUT` idempotente; tope `0 ≤ n ≤ cantidad` (schema + servicio + `CHECK` en BD); invariante `estado_entrega` ↔ `cantidad_entregada` vía `estado_segun_entrega` (E12).

## Evidencia Strict TDD

`apply-progress.md` contiene la tabla de ciclo RED/GREEN/TRIANGULATE/REFACTOR para las 8 fases, con fallos iniciales concretos y conteos de ejecución. Las pruebas de cada fase existen en el diff. Cumple.

## Decisiones de diseño E1–E12

Cumplidas. Desviaciones documentadas en `apply-progress.md`: E3/E4 asignan el estado con `estado_segun_entrega` en lugar de `CASE` SQL (pedido del 01/11, mismo comportamiento observable); `order_by` aditivo en `Comanda.detalles`; `useEntregasModal.ts` y `PaginacionComandas` extraídos por el límite de 50 líneas.

## Criterios del issue #57

- CA 1 (marcar entregado un producto): cubierto por «Entrega completa de un producto» (router) y «Entregar todo» / «+» (modal).
- CA 2 (consultar que no falta servir nada): cubierto por «Todo entregado» (GET y `/pendientes` vacío) y el mensaje «No falta servir nada» en el modal.

## Mapeo de escenarios (31)

| Escenario | Prueba |
| --- | --- |
| PUT: parcial, completa, completar parcial, desmarcar, cero | `test_router.py`: `test_put_entrega_parcial_...`, `_completa_...`, `_desmarcar_y_fijar_cero_...`; `test_service.py`/`test_repository.py` |
| PUT: idempotente | `test_put_entrega_repetida_responde_200_igual` |
| PUT: mayor, negativa, no entera | `test_put_entrega_cantidad_mayor_...`, `test_put_entrega_cuerpo_invalido_...`, `test_schemas.py` |
| PUT: id inválido | `test_put_entrega_id_cero_o_no_numerico_responde_422` |
| PUT: comanda inexistente / detalle ajeno | `test_put_entrega_comanda_inexistente_...`, `_detalle_de_otra_comanda_...` |
| PUT: no abierta / cerrada no admite desmarcar | `test_put_entrega_comanda_cerrada_o_anulada_responde_409`, `test_registrar_entrega_desmarcar_en_comanda_cerrada_lanza_conflicto` |
| Última unidad no cierra; desmarcar bloquea cierre | `test_ciclo_entregar_todo_y_cerrar_responde_200`, `test_ciclo_desmarcar_una_unidad_y_cerrar_responde_409` |
| GET: pendientes y entregados, todo entregado, cerrada, inexistente | `test_get_detalles_...` (4 pruebas) |
| Migración: ya entregados, reversión | `test_migracion_cantidad_entregada_mueve_entregados_a_cantidad`, `_downgrade_conserva_estado_entrega` (más default, CHECK, cabeza única) |
| Modal: +, −, límites, entregar todo, nada falta, error, no abierta | `EntregasComandaDialog.test.tsx` (13 pruebas, incluida `it.each` CERRADA/ANULADA) |
| Cierre: acceso a Entregas, cierre tras entregar todo | `AtencionPage.test.tsx` (sin texto «pendiente de integración»; ciclo de cierre) |

Sin escenarios sin cobertura.

## Hallazgos

### CRITICAL
Ninguno.

### WARNING
1. Condición de carrera «desmarcar vs. cierre»: `cerrar_comanda` lee pendientes fuera de transacción y una comanda podría quedar `CERRADA` con una línea `PENDIENTE`. Documentado en las notas del PR como pendiente para HU-M4-10; no es regresión de esta HU.
2. Tamaño: backend ≈ 1163 líneas contra el punto de control de 800 (por pruebas por escenario). Es un punto de control, no un bloqueo, y la HU no se divide.

### SUGGESTION
1. Cobertura global del frontend 75 % y rama de `format.ts` baja, ajenas a esta HU; sin acción.
2. Para HU-M4-05: reutilizar `estado_segun_entrega` al modificar `cantidad` (ya anotado en el PR).

## Próximo paso
`sdd-archive`.
