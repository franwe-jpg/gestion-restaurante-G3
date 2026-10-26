# Reporte de archivo: HU-M1-11-12 (Modificar y dar de baja una sección)

**Fecha de cierre**: 2026-10-26
**Modo de artefactos**: openspec
**Issues**: #15 (HU-M1-11) y #16 (HU-M1-12) · **PR**: #184 (integrado en `develop` el 2026-10-26, merge commit `5b86e5f`)
**Carpeta archivada**: `openspec/changes/archive/2026-10-26-HU-M1-11-12/`
**Spec principal modificada**: `openspec/specs/carta-secciones/spec.md`
**Orden de archivo**: segundo y último (HU-M1-07-08-09, HU-M1-11-12).

## Estado final al cierre

Fuentes y jerarquía aplicada (de mayor a menor autoridad):

1. Estado de revisión nativa: no se usó compuerta de revisión. El desarrollo guiado por recibos está desactivado y el cambio se cierra bajo la política ordinaria del repositorio. No existe `reviewGate`.
2. Artefacto de tareas (`tasks.md`): 33 de 33 tareas marcadas `[x]`, 0 sin marcar (`grep -c "^- \[ \]"` devuelve 0).
3. Hechos de cierre: los issues #15 y #16 se entregaron en el PR #184, integrado en `develop` el 2026-10-26 con el merge commit `5b86e5f`. Verificado con `git merge-base --is-ancestor 5b86e5f develop`: es ancestro de `develop`.
4. Instantáneas intermedias (`verify-report.md`, `apply-progress.md`): se citan como historial del momento en que se escribieron, no como estado actual.

### Veredicto de verificación

Fuente: `openspec/changes/archive/2026-10-26-HU-M1-11-12/verify-report.md` (`evidence_revision` `sha256:73a0a099ee8cec9f457bb300386053ca641a20a731c894d045e0eacc85042656`), escrito en el momento de la verificación.

- Veredicto: PASS WITH WARNINGS. Blockers: 0. Hallazgos CRITICAL: 0.
- Requisitos 8/8 (7 agregados y 1 modificado); escenarios 28/28 (22 y 6).
- Cifras de prueba a la fecha de la verificación: backend `pytest` 455 aprobadas, cobertura 99,38 %, 10 contratos de importación cumplidos; frontend 343 aprobadas en 29 archivos, líneas 74,63 %; `npm run build` correcto; `alembic heads` con una sola cabeza, sin migración nueva.

### Advertencias del verify-report y su estado al cierre

| Advertencia (verify-report, en el momento de la verificación) | Estado al cierre |
| --- | --- |
| W1. El frontend supera el punto de control de revisión (1089 líneas contra 800) | Nota de punto de control, no bloqueo (AGENTS.md §4). Constaba en las notas del PR #184, que se integró. |
| W2. Casos de 404 en verde antes de implementar (Fase 1) | Sin impacto en el resultado: las pruebas ya comprueban que `detalle` menciona el id. Sin cambio posterior. |

Sugerencias del verify-report (1 a 3), informativas y sin bloqueo: texto «Deshabilitado» de la tarea 4.3 frente a «Deshabilitada» en la tabla (la tarea sigue con «Deshabilitado»; no se modificó el artefacto archivado); cobertura del frontend limitada a `src/App.tsx` y `src/shared/**` (decisión del equipo, AGENTS.md §9.8); formato de la evidencia de Strict TDD por fase y no por tarea.

## Sincronización de specs

| Dominio | Acción | Detalle |
| --- | --- | --- |
| `carta-secciones` | Modificada (agregado y reemplazo) | 7 requisitos agregados con encabezado nuevo (`ADDED`), 1 requisito reemplazado por su versión de `MODIFIED` con el mismo encabezado («Listar secciones»). El contrato del delta se volcó a la sección del contrato. |

### Requisitos agregados (encabezado nuevo, copia textual del bloque)

Se ubicaron en el orden del delta, después de «Listar secciones»: la spec queda con alta, listado, consulta, modificación y baja, igual que `carta-productos`.

| Requisito | Escenarios |
| --- | --- |
| Consultar una sección | 2 |
| Modificar nombre y orden (HU-M1-11 CA 1 y 2) | 7 |
| Agregar productos a una sección (HU-M1-11 CA 3, 5 y 6) | 4 |
| Todo producto pertenece a una sección (HU-M1-11 CA 4) | 2 |
| Reactivar una sección (HU-M1-11 CA 7) | 2 |
| Dar de baja una sección (HU-M1-12 CA 1 y 3) | 3 |
| Confirmar la baja (HU-M1-12 CA 2 y 4) | 2 |

Total: 7 requisitos y 22 escenarios.

### Requisito reemplazado (`MODIFIED`, mismo encabezado)

| Requisito | Escenarios anterior → final | Escenarios anteriores ausentes en el delta |
| --- | --- | --- |
| Listar secciones | 5 → 6 | ninguno |

Los 5 escenarios anteriores reaparecen idénticos en el delta; se suma «Conteo de productos habilitados». El cuerpo nuevo agrega `productos_habilitados` y las acciones «Editar» y «Dar de baja» de la pestaña. Se quitó la nota «(Previously: sin `productos_habilitados` ni acciones por fila.)», que sigue en el delta archivado.

### Contrato de la API

- Tabla: se agregaron `GET /secciones/{id}`, `PUT /secciones/{id}` y `POST /secciones/{id}/baja` (sin cuerpo), textuales, después de `POST /secciones`. La fila `GET /secciones?limit&offset&estado` del delta no se agregó porque la ruta ya tenía su fila (con «orden ascendente por `orden`»); la tabla queda con una fila por ruta.
- Esquemas: la viñeta `SeccionModificar` del delta se agregó textual después de `SeccionCrear`. La viñeta del delta «`SeccionRespuesta` suma `productos_habilitados: int`» se integró en la viñeta existente de `SeccionRespuesta`, que ahora termina en «`productos_habilitados: int` (HU-M1-11-12, S69)».
- La línea del prefijo y del formato de errores del delta ya estaba en la sección y no se repitió.

### Otros cambios en la spec principal

- Título: `# Especificación de carta-secciones`, sin el identificador de una sola HU, como se hizo con `carta-productos` al archivar HU-M1-04; la línea de origen lista las HU.
- Propósito: alta, listado, consulta, modificación (incluida la reactivación) y baja de las secciones, y asignación o traslado de productos. Se quitó «Capacidad nueva: no hay spec previa.», que ya no es cierto. Línea de origen nueva: «Origen: HU-M1-10 (archivado 2026-10-25), HU-M1-01 (listado con filtro) y HU-M1-11-12 (archivados 2026-10-26)».
- Supuestos: se conservó el encabezado `## Supuestos nuevos` de la spec principal (no se agregó un segundo `## Supuestos`). Las 6 líneas del delta se agregaron al final con el marcador de la spec principal: «Supuesto S69: …» pasó a «Supuesto: S69. …» (y así hasta S74), con mayúscula inicial tras el número, igual que en `carta-productos`. En S74, «S68 de la propuesta» pasó a «S68 de la propuesta de HU-M1-11-12», y la línea existente «S1 a S6 de la propuesta» pasó a «S1 a S6 de la propuesta de HU-M1-10», porque la spec ya reúne supuestos de dos propuestas.
- S70 ya llega enmendado según S75 del diseño (422 de forma antes del 404 de la sección); no se agregó S75 a la spec.

### Conteos

| Fuente | Requisitos | Escenarios |
| --- | --- | --- |
| Spec principal antes del archivo | 9 | 28 |
| Delta de HU-M1-11-12 | 8 | 28 |
| Fuentes sumadas | 17 | 56 |
| Reemplazados por `MODIFIED` (versión anterior) | −1 | −5 |
| Spec principal después del archivo | 16 | 51 |

Detalle de escenarios: 28 − 5 (escenarios anteriores de «Listar secciones») + 6 (`MODIFIED` del delta) + 22 (`ADDED`) = 51.

## Estado final de la spec principal

`openspec/specs/carta-secciones/spec.md`: 16 requisitos y 51 escenarios, sin encabezados de requisito repetidos ni encabezados de escenario repetidos dentro de un mismo requisito. Contrato con 6 filas, una por ruta.

## Trazabilidad de artefactos (modo openspec)

Rutas en el archivo:

- `proposal.md`, `design.md`, `tasks.md`, `apply-progress.md`, `verify-report.md`
- `specs/carta-secciones/spec.md`

No hay `exploration.md` en este cambio.

## Verificación mecánica

Conteo de requisitos y escenarios (la lista final es de encabezados de escenario repetidos dentro de un mismo requisito):

```
main-before-1112.md requisitos 9 escenarios 28 dups []
HU-M1-11-12/specs/carta-secciones/spec.md requisitos 8 escenarios 28 dups []
openspec/specs/carta-secciones/spec.md requisitos 16 escenarios 51 dups []
```

Cobertura de escenarios (cada cuerpo de escenario de las fuentes buscado textual en la spec principal nueva):

```
target 51 scenarios
source scenarios 56 distinct bodies 51
EXACT DUP: 5 pares principal/delta de «Listar secciones» (los conservados por MODIFIED)
(sin líneas MISSING)
```

Contrato: las 3 filas nuevas y la viñeta `SeccionModificar` del delta (líneas 9 a 11 y 13) se buscaron textuales en la spec principal; todas coinciden.

Notas de reemplazo: `grep -n 'Previously\|Reemplaza a' openspec/specs/carta-secciones/spec.md` sin salida.

Encabezados de requisito repetidos: `grep '^### Requisito' openspec/specs/carta-secciones/spec.md | sort | uniq -d` sin salida.

Movimiento con `git mv` a `openspec/changes/archive/2026-10-26-HU-M1-11-12`, comparado contra una instantánea tomada antes del movimiento:

```
diff -r snap-1112 openspec/changes/archive/2026-10-26-HU-M1-11-12
exit=0
```

`openspec/changes/` contiene solo `archive/`. Este reporte se agregó después de la comparación y no forma parte de ella.

## Notas

- Ningún artefacto archivado fue modificado.
- Con este archivo se cierran los dos cambios de la secuencia. No queda ningún cambio activo en `openspec/changes/`.

## Riesgos

1. Los requisitos de HU-M1-10 siguen con el rótulo `(CA n)` sin la HU, y los nuevos usan `(HU-M1-11 CA n)` o `(HU-M1-12 CA n)`. El número no es ambiguo dentro de cada encabezado, pero un próximo cambio puede unificarlos a `(HU-M1-10 CA n)`, como se hizo en `carta-productos`.
2. La fila `GET /productos?limit&offset` del contrato de `carta-secciones` sigue describiendo `Pagina[ProductoRespuesta]`; `carta-productos` ya la define como `Pagina[ProductoListado]` con el parámetro `estado` (HU-M1-13). No es parte de este cambio y queda para una corrección posterior.
3. La sugerencia 1 del verify-report («Deshabilitado» en la tarea 4.3) queda sin corregir en el artefacto archivado.
