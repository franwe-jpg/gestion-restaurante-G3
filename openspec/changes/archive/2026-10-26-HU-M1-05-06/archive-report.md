# Reporte de archivo: HU-M1-05-06 (Modificar y dar de baja un postre)

**Fecha de cierre**: 2026-10-26
**Modo de artefactos**: openspec
**Issues**: #7 (HU-M1-05) y #8 (HU-M1-06) · **PR**: #181 (integrado en `develop` el 2026-10-26, merge commit `2377ccb`)
**Carpeta archivada**: `openspec/changes/archive/2026-10-26-HU-M1-05-06/`
**Spec principal modificada**: `openspec/specs/carta-productos/spec.md`
**Orden de archivo**: cuarto y último (HU-M1-01, HU-M1-04, HU-M1-02-03-13, HU-M1-05-06).

## Estado final al cierre

Fuentes y jerarquía aplicada (de mayor a menor autoridad):

1. Estado de revisión nativa: no se usó compuerta de revisión. El desarrollo guiado por recibos está desactivado y el cambio se cierra bajo la política ordinaria del repositorio. No existe `reviewGate`.
2. Artefacto de tareas (`tasks.md`): 26 de 26 tareas marcadas `[x]`, 0 sin marcar (`grep -c "^- \[ \]"` devuelve 0).
3. Hechos de cierre: los issues #7 y #8 se entregaron en el PR #181, integrado en `develop` el 2026-10-26 con el merge commit `2377ccb`. Verificado con `git merge-base --is-ancestor 2377ccb develop`: es ancestro de `develop`.
4. Instantáneas intermedias (`verify-report.md`, `apply-progress.md`): se citan como historial del momento en que se escribieron, no como estado actual.

### Veredicto de verificación

Fuente: `openspec/changes/archive/2026-10-26-HU-M1-05-06/verify-report.md`, escrito en el momento de la verificación. Su encabezado no tiene `evidence_revision`.

- Veredicto: PASS WITH WARNINGS. Blockers: 0. Hallazgos CRITICAL: 0.
- Requisitos 14/14 (11 agregados y 3 modificados); escenarios 49/49 (40 COMPLIANT directos y 9 COMPLIANT por código compartido).
- Cifras de prueba a la fecha de la verificación: backend `pytest` 351 aprobadas, cobertura 99,30 %, 10 contratos de importación cumplidos; frontend 263 aprobadas en 27 archivos, líneas 74,57 %; `npm run build` correcto.

### Advertencias del verify-report y su estado al cierre

| Advertencia (verify-report, en el momento de la verificación) | Estado al cierre |
| --- | --- |
| W1. Escenarios de backend del postre cubiertos solo por las pruebas de platos (mismo `service` genérico, F8) | Sin evidencia de corrección posterior. Cobertura indirecta conocida. |
| W2. Escenarios de pantalla del postre probados con `categoria="PLATO"` | Sin evidencia de corrección posterior. Cobertura indirecta conocida. |
| W3. Sin prueba del recorrido unido «Reactivar desde la lista filtrada» | Sin evidencia de corrección posterior. Cubierto por tramos. |

Sugerencias del verify-report (1 a 3), informativas y sin bloqueo: prueba parametrizada por categoría para imagen quitada y falla del `commit`; caso de reactivación de un postre en `ProductoEditarPage.test`; anotar el hash `c6a85c2` del commit de artefactos (es el commit `docs: agrega los artefactos de SDD de HU-M1-05-06`, entregado con el PR #181).

## Sincronización de specs

| Dominio | Acción | Detalle |
| --- | --- | --- |
| `carta-productos` | Modificada (agregado y reemplazo) | 12 requisitos agregados con encabezado nuevo (11 de `ADDED` y 1 de `MODIFIED` sin requisito previo), 2 requisitos reemplazados por su versión de `MODIFIED`. Ningún encabezado del delta coincide con uno de la spec principal, por lo que no hubo fusión por encabezado. |

### Requisitos agregados (encabezado nuevo, copia textual del bloque)

Cada requisito del postre se ubicó inmediatamente después de su par del plato.

| Requisito | Después de | Escenarios |
| --- | --- | --- |
| Consultar un postre | Consultar un plato | 4 |
| Modificar los datos del postre (HU-M1-05 CA 1) | Modificar los datos del plato (HU-M1-02 CA 1) | 3 |
| Modificar ingredientes, etiquetas e imagen del postre (HU-M1-05 CA 2) | Modificar ingredientes, etiquetas e imagen (HU-M1-02 CA 2) | 6 |
| Reglas de validación del alta en la modificación del postre (HU-M1-05 CA 3) | Reglas de validación del alta (HU-M1-02 CA 3) | 10 |
| Atomicidad de la modificación del postre | Atomicidad de la modificación | 1 |
| Las facturas conservan el precio del postre (HU-M1-05 CA 4, S18) | Las facturas conservan el precio (HU-M1-02 CA 4, Supuesto S18) | 1 |
| Reactivar un postre deshabilitado (HU-M1-05 CA 5) | Reactivar un plato deshabilitado (HU-M1-02 CA 5) | 4 |
| Dar de baja un postre (HU-M1-06 CA 1) | Dar de baja un plato (HU-M1-03 CA 1) | 5 |
| Cancelar la baja del postre (HU-M1-06 CA 2) | Cancelar la baja (HU-M1-03 CA 2) | 1 |
| La baja conserva los datos del postre (HU-M1-06 CA 3, S18) | La baja conserva los datos (HU-M1-03 CA 3, Supuesto S18) | 2 |
| Reactivar un postre dado de baja (HU-M1-06 CA 4) | Reactivar un plato dado de baja (HU-M1-03 CA 4, Supuesto S17) | 4 |
| El alta y la edición de platos no cambian (regresión) | El alta de platos y postres no cambia (regresión) | 1 |

El delta lista «El alta y la edición de platos no cambian (regresión)» bajo `## MODIFIED Requirements`, pero no dice a qué requisito reemplaza y su encabezado no existe en la spec principal; la propuesta solo declara como modificado el requisito del enlace de editar. Se agregó como requisito nuevo, sin reemplazar «El alta de platos y postres no cambia (regresión)», para no perder el escenario «Alta tras agregar el modo edición».

### Requisitos reemplazados (`MODIFIED`)

| Requisito anterior (HU-M1-02-03-13) | Requisito nuevo | Escenarios |
| --- | --- | --- |
| Enlace de editar solo en platos (HU-M1-13, S27) | Enlace de editar en platos y postres (HU-M1-13, S27, S31) | Anterior 2, delta 3, final 3 |
| Dar de baja desde la fila (HU-M1-13, S28, E13) | Dar de baja desde la fila de platos y postres (HU-M1-13, S28, E13, S31) | Anterior 3, delta 4, final 7 |

Detalle del reemplazo:

- En ambos cuerpos se quitó la nota «Reemplaza a … de HU-M1-02-03-13.», que sigue en el delta archivado.
- «Enlace de editar en platos y postres»: el escenario anterior «Editar un plato» es idéntico al del delta y queda una sola vez. El escenario anterior «Postres y bebidas sin editar» se eliminó porque contradice la regla nueva (las filas de postres ahora ofrecen «Editar», S31); lo sustituyen «Editar un postre» y «Bebidas sin acciones».
- «Dar de baja desde la fila de platos y postres»: el delta no repetía los escenarios del plato ni el texto de confirmación del plato. Para no perder reglas vigentes se conservaron los tres escenarios anteriores («Baja desde la lista», «Cancelar la baja desde la lista», «Plato deshabilitado sin «Dar de baja»») delante de los cuatro del delta, y el cuerpo del delta se completó con el texto de confirmación del plato: «El texto de confirmación de un plato es «El plato quedará deshabilitado y dejará de mostrarse en la carta. Puede volver a habilitarlo desde la pantalla de edición.»; el de un postre es el de S32.»

### Otros cambios en la spec principal

- Propósito: alta, consulta, modificación (incluida la reactivación) y baja de platos y postres, y listado con filtro de estado. Línea de origen: «Origen: HU-M1-01, HU-M1-04, HU-M1-02-03-13 y HU-M1-05-06 (archivados 2026-10-26)».
- Contrato de la API: filas nuevas `GET /postres/{id}`, `PUT /postres/{id}` y `POST /postres/{id}/baja`, después de `POST /postres`. Las viñetas del delta se agregaron textuales en el bloque «Consulta, modificación y baja de postres (HU-M1-05 y HU-M1-06)».
- Supuestos: se agregaron los 4 del delta; en el segundo, «de la propuesta» pasó a «de la propuesta de HU-M1-05-06». La línea de S15 a S28 de HU-M1-02-03-13 se anotó con «(S27, para postres, reemplazado por S31)».
- Formato: se restituyó la línea en blanco entre `## Requisitos` y el primer requisito, que se había perdido al archivar HU-M1-02-03-13 (commit anterior de esta secuencia).

### Conteos

| Fuente | Requisitos | Escenarios |
| --- | --- | --- |
| Spec principal antes del archivo | 42 | 160 |
| Delta de HU-M1-05-06 | 14 | 49 |
| Fuentes sumadas | 56 | 209 |
| Reemplazados por `MODIFIED` | −2 | — |
| Cuerpos de escenario distintos (sin duplicados exactos) | — | 205 |
| Spec principal después del archivo | 54 | 207 |

Detalle de escenarios: 160 − 5 (escenarios de los dos requisitos reemplazados) + 49 (delta) + 3 (escenarios del plato conservados en «Dar de baja desde la fila de platos y postres») = 207.

Duplicados exactos de cuerpo encontrados (4): «Ingredientes vacíos o repetidos», «Etiquetas y descripción inválidas» y «Error indicado en el formulario» tienen el mismo texto en el requisito del plato y en el del postre; se conservan en ambos porque son requisitos distintos. «Editar un plato» queda una sola vez. De los 205 cuerpos distintos, el único que no figura en la spec final es «Postres y bebidas sin editar», eliminado a propósito por contradecir el requisito que lo reemplaza.

## Estado final de la spec principal

`openspec/specs/carta-productos/spec.md`: 54 requisitos y 207 escenarios, sin encabezados de requisito repetidos ni encabezados de escenario repetidos dentro de un mismo requisito. Contrato con 11 filas, una por ruta.

## Trazabilidad de artefactos (modo openspec)

Rutas en el archivo:

- `proposal.md`, `design.md`, `tasks.md`, `apply-progress.md`, `verify-report.md`
- `specs/carta-productos/spec.md`

No hay `exploration.md` en este cambio.

## Verificación mecánica

Conteo de requisitos y escenarios (la lista final es de encabezados de escenario repetidos dentro de un mismo requisito):

```
main-before-0506.md requisitos 42 escenarios 160 dups []
HU-M1-05-06/specs/carta-productos/spec.md requisitos 14 escenarios 49 dups []
openspec/specs/carta-productos/spec.md requisitos 54 escenarios 207 dups []
```

Cobertura de escenarios (cada cuerpo de escenario de las fuentes buscado textual en la spec principal nueva):

```
target 207 scenarios
source scenarios 209 distinct bodies 205
EXACT DUP: «Ingredientes vacíos o repetidos» (plato y postre)
EXACT DUP: «Etiquetas y descripción inválidas» (plato y postre)
EXACT DUP: «Error indicado en el formulario» (plato y postre)
EXACT DUP: «Editar un plato» (requisito anterior y requisito nuevo)
MISSING: «Enlace de editar solo en platos», «Postres y bebidas sin editar» (eliminado a propósito)
```

Viñetas del contrato: cada línea 19 a 29 del delta se buscó textual en la spec principal; todas coinciden.

Notas de reemplazo: `grep -n 'Reemplaza a\|Previously' openspec/specs/carta-productos/spec.md` sin salida.

Encabezados de requisito repetidos: `grep '^### Requisito' openspec/specs/carta-productos/spec.md | sort | uniq -d` sin salida.

Movimiento con `git mv` a `openspec/changes/archive/2026-10-26-HU-M1-05-06`, comparado contra una instantánea tomada antes del movimiento:

```
diff -r snap-0506 openspec/changes/archive/2026-10-26-HU-M1-05-06
exit=0
```

`openspec/changes/` contiene solo `archive/`. Este reporte se agregó después de la comparación y no forma parte de ella.

## Notas

- Ningún artefacto archivado fue modificado.
- Con este archivo se cierran los cuatro cambios de M1 de la secuencia. No queda ningún cambio activo en `openspec/changes/`.

## Riesgos

1. Advertencias W1 a W3 del verify-report siguen sin evidencia de corrección en el repositorio.
2. Los requisitos de modificación y baja quedan en pares plato y postre con encabezados distintos y reglas iguales; un próximo cambio (por ejemplo, bebidas en HU-M1-08) puede preferir unificarlos en requisitos por categoría.
3. El escenario «Baja de un plato desde la lista no cambia» dice «como antes de este cambio», redacción propia del delta que se conservó textual.
