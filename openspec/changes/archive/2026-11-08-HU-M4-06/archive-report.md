# Informe de archivo: HU-M4-06 — Anular Comanda

## Estado al cierre

La HU-M4-06 queda archivada desde la rama `feature/HU-M4-06-eliminar-comanda`. El estado nativo de OpenSpec inmediatamente antes del archivo indicaba `archive: ready`, `apply: all_done` y 26/26 tareas completas. Se preservaron los artefactos históricos de propuesta, especificación, diseño, tareas, progreso de aplicación y verificación; las tareas se mantienen byte por byte, sin alterar sus casillas.

La implementación M4/M6/frontend focalizada está presente en la rama. M6 expone únicamente el método público `pagos.service.esta_facturada(db, comanda_id) -> bool`, delegado a la consulta existente del repositorio. No se alteraron otros comportamientos M6 ni los contratos M3/S2-01. El contrato HTTP confirmado es `POST /api/v1/comandas/{comanda_id}/anular`, sin cuerpo, respuesta `200 ComandaSalida` y errores `404`/`409`/`422` con `detalle`.

## Especificación sincronizada

La especificación completa `comanda-anulacion` se copió mecánicamente desde la delta a `openspec/specs/comanda-anulacion/spec.md`; no existía una especificación principal antes de archivar. La comparación recursiva posterior a la copia no produjo diferencias.

## Verificación final reportada

- Selector M6: 3 passed, 22 deselected.
- Servicio M4: 9 passed, 55 deselected; router M4: 3 passed, 92 deselected, ejecutados por separado.
- Frontend API y AtencionPage: 30 passed.
- Ruff/formato, ESLint/Prettier, `lint-imports`, typecheck y diff-check pasaron según los artefactos de aplicación/verificación.
- La ejecución combinada de pruebas M4 expiró mientras competía con otro proceso pytest; no se considera aprobada. La ejecución del archivo de pruebas M6 más amplio expiró tras 9/22; tampoco se considera aprobada.
- No constan resultados verificables para suites completas, cobertura ni build. El responsable dijo haber corrido manualmente las suites completas, pero no adjuntó comandos, logs ni resultados; se registra como reportado, no verificado, y no como PASS.

## Hallazgos y alcance

- La carrera entre la consulta de facturación y la anulación fue aceptada y diferida al próximo sprint. No se implementó mitigación concurrente.
- No se modificaron M3 ni S2-01; este último define DTO/doble, no rutas HTTP.
- `size:exception` fue aceptada explícitamente para la estrategia single-PR. El archivo es documentación local y no implica aprobación de PR, integración ni despliegue. No se cambió el estado de issues o PR.
- El archivo de base de datos `backend/restaurante.db.backup` no fue tocado.

## Evidencia mecánica

`diff -r openspec/changes/HU-M4-06/specs/comanda-anulacion/spec.md openspec/specs/comanda-anulacion/spec.md`: sin salida; código de salida 0.

`diff -r /tmp/sdd-archive.0Pq6bP/source openspec/changes/archive/2026-11-08-HU-M4-06`: sin salida; código de salida 0. El snapshot temporal fue eliminado al finalizar la operación; la ruta mostrada es la ruta del snapshot usada para esa comparación.
