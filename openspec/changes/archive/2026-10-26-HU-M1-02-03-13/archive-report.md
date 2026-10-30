# Reporte de archivo: HU-M1-02-03-13 (Modificar y dar de baja un plato; listar productos)

**Fecha de cierre**: 2026-10-26
**Modo de artefactos**: openspec
**Issues**: #3 (HU-M1-02), #4 (HU-M1-03) y #18 (HU-M1-13) · **PR**: #180 (integrado en `develop` el 2026-10-26, merge commit `f8e8014`)
**Carpeta archivada**: `openspec/changes/archive/2026-10-26-HU-M1-02-03-13/`
**Spec principal modificada**: `openspec/specs/carta-productos/spec.md`
**Orden de archivo**: tercero de cuatro (HU-M1-01, HU-M1-04, HU-M1-02-03-13, HU-M1-05-06).

## Estado final al cierre

Fuentes y jerarquía aplicada (de mayor a menor autoridad):

1. Estado de revisión nativa: no se usó compuerta de revisión. El desarrollo guiado por recibos está desactivado y el cambio se cierra bajo la política ordinaria del repositorio. No existe `reviewGate`.
2. Artefacto de tareas (`tasks.md`): 81 de 81 tareas marcadas `[x]`, 0 sin marcar (`grep -c "^- \[ \]"` devuelve 0; tampoco hay `[ ]` en otra posición del archivo).
3. Hechos de cierre: los issues #3, #4 y #18 se entregaron en el PR #180, integrado en `develop` el 2026-10-26 con el merge commit `f8e8014`. Verificado con `git merge-base --is-ancestor f8e8014 develop`: es ancestro de `develop`.
4. Instantáneas intermedias (`verify-report.md`, `apply-progress.md`): se citan como historial del momento en que se escribieron, no como estado actual. En particular, el WARNING 3 del verify-report menciona el PR #179 sin integrar; el hecho de cierre es el PR #180 integrado.

### Veredicto de verificación

Fuente: `openspec/changes/archive/2026-10-26-HU-M1-02-03-13/verify-report.md` (`evidence_revision` `sha256:a8f8b283dd6e7a881eaabf1641a0e6add245082040a9378ec8fbf6bf63bee80e`), escrito en el momento de la verificación.

- Veredicto: PASS WITH WARNINGS. Blockers: 0. Hallazgos CRITICAL: 0.
- Requisitos 23/23; escenarios 68/68 (67 COMPLIANT y 1 PARTIAL, contado como completo por el validador).
- Cifras de prueba a la fecha de la verificación: backend `pytest` 328 aprobadas, cobertura 99,29 %, 10 contratos de importación cumplidos; frontend 245 aprobadas en 27 archivos, líneas 74,57 %; `npm run build` correcto.

### Advertencias del verify-report y su estado al cierre

| Advertencia (verify-report, en el momento de la verificación) | Estado al cierre |
| --- | --- |
| W1. «Reactivar desde la lista filtrada» sin prueba del recorrido completo (PARTIAL) | Sin evidencia de corrección posterior. Cubierto por tramos. |
| W2. Tamaño por encima del punto de control de 800 líneas (5 004 agregadas y 293 borradas en 47 archivos) | Informativo. PR único por HU (AGENTS.md, sección 4). |
| W3. La rama agrupa tres HU con el nombre de la primera | Informativo. El PR #180 se integró en `develop`. |

Sugerencias del verify-report (1 a 4), informativas y sin bloqueo: prueba propia de «Pantalla de edición de un plato deshabilitado»; prueba de punta a punta de «Postres y bebidas sin editar» (el escenario queda reemplazado por HU-M1-05-06); 404 de edición distinguido por texto; avisos al equipo y validación de S20, S24, S25 y S29.

## Sincronización de specs

| Dominio | Acción | Detalle |
| --- | --- | --- |
| `carta-productos` | Modificada (agregado) | Delta solo con `ADDED`. Ninguno de sus 23 requisitos tiene el mismo encabezado que uno de la spec principal, por lo que no hubo fusión: los 23 se agregaron con su texto y sus escenarios sin cambios (copia de bloques por script), ordenados por operación. Ningún requisito se eliminó ni se reemplazó. |

### Requisitos agregados y posición

| Grupo | Requisitos (en orden) | Escenarios |
| --- | --- | --- |
| Alta (regresión) | El alta de platos y postres no cambia (regresión), después de «El alta de platos no cambia (regresión)» | 2 |
| Consulta | Consultar un plato | 3 |
| Modificación | Modificar los datos del plato (HU-M1-02 CA 1); Modificar ingredientes, etiquetas e imagen (HU-M1-02 CA 2); Reglas de validación del alta (HU-M1-02 CA 3); Atomicidad de la modificación; Las facturas conservan el precio (HU-M1-02 CA 4, Supuesto S18); Reactivar un plato deshabilitado (HU-M1-02 CA 5) | 3 + 6 + 10 + 1 + 1 + 5 = 26 |
| Baja | Dar de baja un plato (HU-M1-03 CA 1); Cancelar la baja (HU-M1-03 CA 2); La baja conserva los datos (HU-M1-03 CA 3, Supuesto S18); Reactivar un plato dado de baja (HU-M1-03 CA 4, Supuesto S17) | 5 + 1 + 2 + 4 = 12 |
| Listado | Listar los productos con su detalle (HU-M1-13 CA 1); Lista vacía (CA 2); Filtro de estado por defecto Habilitados (CA 3); Filtrar por Habilitados (CA 4); Filtrar por Deshabilitados (CA 5); Filtrar por Todos con su estado (CA 6); Estado inválido en el listado; Paginación del listado (D-27); El selector de productos de secciones no cambia (regresión) | 3 + 2 + 2 + 2 + 2 + 2 + 1 + 4 + 2 = 20 |
| Filas de la lista (frontend) | Enlace de editar solo en platos (HU-M1-13, S27); Dar de baja desde la fila (HU-M1-13, S28, E13) | 2 + 3 = 5 |

### Otros cambios en la spec principal

- Propósito: se agregan consulta, modificación (incluida la reactivación) y baja de platos, y el listado con filtro de estado. Línea de origen: «Origen: HU-M1-01, HU-M1-04 y HU-M1-02-03-13 (archivados 2026-10-26)».
- Contrato de la API: filas nuevas `GET /platos/{id}`, `PUT /platos/{id}` y `POST /platos/{id}/baja`. Las dos filas del delta para `GET /productos` (sin `estado` y con `estado`) son la misma ruta y se unieron en una sola fila con el contrato final: `GET /productos?estado&limit&offset` → 200 `Pagina[ProductoListado]`; sin `estado`, solo `HABILITADO`; errores 422.
- Contrato de la API: las viñetas del delta se agregaron en dos bloques, «Consulta, modificación y baja de platos (HU-M1-02 y HU-M1-03)» y «Listado de productos (HU-M1-13)», con el texto del delta. Única diferencia de redacción: la viñeta del listado empieza con «Supuesto S29:» en lugar de «Lista (HU-M1-13), Supuesto S29:», porque el bloque ya lleva el título.
- Supuestos: se agregaron los 7 del delta. En el primero, «de la propuesta» pasó a «de la propuesta de HU-M1-02-03-13», para distinguirla de la de HU-M1-01.

### Conteos

| Fuente | Requisitos | Escenarios |
| --- | --- | --- |
| Spec principal antes del archivo | 19 | 92 |
| Delta de HU-M1-02-03-13 | 23 | 68 |
| Fuentes sumadas | 42 | 160 |
| Duplicados exactos | 0 | 0 |
| Spec principal después del archivo | 42 | 160 |

## Trazabilidad de artefactos (modo openspec)

Rutas en el archivo:

- `proposal.md`, `design.md`, `tasks.md`, `apply-progress.md`, `verify-report.md`
- `specs/carta-productos/spec.md`

No hay `exploration.md` en este cambio.

## Verificación mecánica

Conteo de requisitos y escenarios (la lista final es de encabezados de escenario repetidos dentro de un mismo requisito):

```
main-before-020313.md requisitos 19 escenarios 92 dups []
HU-M1-02-03-13/specs/carta-productos/spec.md requisitos 23 escenarios 68 dups []
openspec/specs/carta-productos/spec.md requisitos 42 escenarios 160 dups []
```

Cobertura de escenarios (cada cuerpo de escenario de las fuentes buscado textual en la spec principal nueva):

```
target 160 scenarios
source scenarios 160 distinct bodies 160
(sin líneas EXACT DUP ni MISSING)
```

Viñetas del contrato: cada línea 21 a 32 del delta se buscó textual en la spec principal; la única que no coincide es la del listado, por el cambio de encabezado descrito arriba.

Encabezados de requisito repetidos: `grep '^### Requisito' openspec/specs/carta-productos/spec.md | sort | uniq -d` sin salida.

Movimiento con `git mv` a `openspec/changes/archive/2026-10-26-HU-M1-02-03-13`, comparado contra una instantánea tomada antes del movimiento:

```
diff -r snap-020313 openspec/changes/archive/2026-10-26-HU-M1-02-03-13
exit=0
```

Este reporte se agregó después de la comparación y no forma parte de ella.

## Notas

- Ningún artefacto archivado fue modificado.
- Los requisitos «Enlace de editar solo en platos» y «Dar de baja desde la fila» quedan vigentes en la spec principal hasta el archivo de HU-M1-05-06, que los reemplaza.
- El cambio queda cerrado. El siguiente archivo de la secuencia es HU-M1-05-06.

## Riesgos

1. Advertencia W1 del verify-report sigue sin evidencia de corrección en el repositorio.
2. Los requisitos de modificación y baja son solo de platos; HU-M1-05-06 agrega sus equivalentes para postres con encabezados propios.
