# Reporte de archivo: HU-M1-07-08-09 (Crear, modificar y dar de baja una bebida)

**Fecha de cierre**: 2026-10-26
**Modo de artefactos**: openspec
**Issues**: #10 (HU-M1-07), #11 (HU-M1-08) y #12 (HU-M1-09) · **PR**: #183 (integrado en `develop` el 2026-10-26, merge commit `84ce289`)
**Carpeta archivada**: `openspec/changes/archive/2026-10-26-HU-M1-07-08-09/`
**Spec principal modificada**: `openspec/specs/carta-productos/spec.md`
**Orden de archivo**: primero de dos (HU-M1-07-08-09, HU-M1-11-12).

## Estado final al cierre

Fuentes y jerarquía aplicada (de mayor a menor autoridad):

1. Estado de revisión nativa: no se usó compuerta de revisión. El desarrollo guiado por recibos está desactivado y el cambio se cierra bajo la política ordinaria del repositorio. No existe `reviewGate`.
2. Artefacto de tareas (`tasks.md`): 30 de 30 tareas marcadas `[x]`, 0 sin marcar (`grep -c "^- \[ \]"` devuelve 0).
3. Hechos de cierre: los issues #10, #11 y #12 se entregaron en el PR #183, integrado en `develop` el 2026-10-26 con el merge commit `84ce289`. Verificado con `git merge-base --is-ancestor 84ce289 develop`: es ancestro de `develop`.
4. Instantáneas intermedias (`verify-report.md`, `apply-progress.md`): se citan como historial del momento en que se escribieron, no como estado actual.

El verify-report dice «33 tareas marcadas `[x]`»; en `tasks.md` hay 30 líneas `[x]` y ninguna `[ ]`. La diferencia es del conteo del informe, no de tareas abiertas.

### Veredicto de verificación

Fuente: `openspec/changes/archive/2026-10-26-HU-M1-07-08-09/verify-report.md` (`evidence_revision` `sha256:02a71dbf6bd09dc7c759f2b867c609c40467e39ef9cb676743025eedcdbb456a`), escrito en el momento de la verificación.

- Veredicto: PASS WITH WARNINGS. Blockers: 0. Hallazgos CRITICAL: 0.
- Requisitos 32/32 (15 agregados y 17 modificados); escenarios 182/182 (56 y 126).
- Cifras de prueba a la fecha de la verificación: backend `pytest` 413 aprobadas, cobertura 99,32 %, 10 contratos de importación cumplidos; frontend 316 aprobadas en 27 archivos, líneas 74,57 %; `npm run build` correcto; `alembic heads` con una sola cabeza, sin migración nueva.

### Advertencias del verify-report y su estado al cierre

| Advertencia (verify-report, en el momento de la verificación) | Estado al cierre |
| --- | --- |
| W1. Escenarios de modificación del backend de la bebida cubiertos solo por las pruebas de platos (mismo `service`, G7) | Sin evidencia de corrección posterior. Cobertura indirecta conocida. |
| W2. Escenarios de la pantalla de edición cubiertos solo con el plato | Sin evidencia de corrección posterior. Cobertura indirecta conocida. |

Sugerencias del verify-report, informativas y sin bloqueo:

- 1 (la cobertura del frontend no mide `modules/productos/`): sin cambios; es una decisión del equipo (AGENTS.md §9.8).
- 2 (nota inexacta sobre `lazy` en `apply-progress.md`): corregida en el commit `ee28718`, entregado con el PR #183.
- 3 (nombre engañoso de la prueba del chip repetido de bebidas): corregida en el commit `5b5fd12` («rechaza un ingrediente repetido (CA 6)»), entregado con el PR #183.
- 4 (pruebas mínimas por categoría para imagen quitada, falla del `commit` y reactivación): sin evidencia de corrección posterior.

## Sincronización de specs

| Dominio | Acción | Detalle |
| --- | --- | --- |
| `carta-productos` | Modificada (agregado y reemplazo) | 14 requisitos agregados con encabezado nuevo (de los 15 de `ADDED`; el del contrato se volcó a la sección del contrato), 17 requisitos reemplazados por su versión de `MODIFIED` con el mismo encabezado. |

### Requisitos agregados (encabezado nuevo, copia textual del bloque)

Cada requisito de la bebida se ubicó inmediatamente después de su par del postre.

| Requisito | Después de | Escenarios |
| --- | --- | --- |
| Crear bebida (HU-M1-07 CA 1) | Crear postre (HU-M1-04 CA 1) | 5 |
| Nombre único entre bebidas (HU-M1-07 CA 3) | Nombre único entre postres (HU-M1-04 CA 3) | 3 |
| El alta y la edición de platos y postres no cambian con las bebidas (regresión) | El alta y la edición de platos no cambian (regresión) | 2 |
| Consultar una bebida | Consultar un postre | 5 |
| Modificar los datos de la bebida (HU-M1-08 CA 1) | Modificar los datos del postre (HU-M1-05 CA 1) | 3 |
| Modificar ingredientes, etiquetas e imagen de la bebida (HU-M1-08 CA 2) | Modificar ingredientes, etiquetas e imagen del postre (HU-M1-05 CA 2) | 8 |
| Reglas de validación del alta en la modificación de la bebida (HU-M1-08 CA 3) | Reglas de validación del alta en la modificación del postre (HU-M1-05 CA 3) | 10 |
| Atomicidad de la modificación de la bebida | Atomicidad de la modificación del postre | 1 |
| Las facturas conservan el precio de la bebida (HU-M1-08 CA 4, S18) | Las facturas conservan el precio del postre (HU-M1-05 CA 4, S18) | 1 |
| Reactivar una bebida deshabilitada (HU-M1-08 CA 5) | Reactivar un postre deshabilitado (HU-M1-05 CA 5) | 4 |
| Dar de baja una bebida (HU-M1-09 CA 1) | Dar de baja un postre (HU-M1-06 CA 1) | 5 |
| Cancelar la baja de la bebida (HU-M1-09 CA 2) | Cancelar la baja del postre (HU-M1-06 CA 2) | 1 |
| La baja conserva los datos de la bebida (HU-M1-09 CA 3, S18) | La baja conserva los datos del postre (HU-M1-06 CA 3, S18) | 2 |
| Reactivar una bebida dada de baja (HU-M1-09 CA 4) | Reactivar un postre dado de baja (HU-M1-06 CA 4) | 4 |

Total: 14 requisitos y 54 escenarios.

### Requisito del contrato (`ADDED`, no se conserva como requisito)

«Contrato de la API de bebidas» (2 escenarios) no se agregó como requisito, porque la spec principal mantiene el contrato fuera de los requisitos, igual que se hizo con los postres en HU-M1-05-06:

- Sus 4 filas (`POST /bebidas`, `GET /bebidas/{id}`, `PUT /bebidas/{id}`, `POST /bebidas/{id}/baja`) se agregaron textuales a la tabla de `## Contrato de la API`, después de `POST /postres/{id}/baja`. Ninguna ruta estaba repetida.
- Sus 6 viñetas («Reglas del contrato») se agregaron textuales en el bloque «Alta, consulta, modificación y baja de bebidas (HU-M1-07, HU-M1-08 y HU-M1-09)», después del bloque de postres y antes de «Listado de productos (HU-M1-13)». La frase de introducción del delta («Las rutas de bebidas se suman… igual que las de las otras categorías») encabeza ese bloque; la del prefijo y el formato de errores ya estaba en la sección.
- Sus 2 escenarios no se trasladaron. Quedan cubiertos por escenarios de requisitos agregados: «Rutas de bebidas disponibles» por «Alta válida mínima» (201, `BEBIDA`), «Bebida existente» (200), «Cambio válido de datos» y «Baja confirmada» (200); «Error con formato de la API» por «Id inexistente o de otra categoría» de «Consultar una bebida» (404 con `{"detalle": ...}`). Siguen en el delta archivado.

### Requisitos reemplazados (`MODIFIED`, mismo encabezado)

Antes de reemplazar se comprobó que cada encabezado de escenario del requisito principal siguiera en el cuerpo del delta. Todos los escenarios conservados tienen texto idéntico al anterior.

| Requisito | Escenarios anterior → final | Escenarios anteriores ausentes en el delta |
| --- | --- | --- |
| Campos obligatorios (HU-M1-01 CA 2, HU-M1-04 CA 2) | 7 → 10 | ninguno |
| Largo del nombre (HU-M1-01 CA 4, HU-M1-04 CA 4) | 4 → 6 | ninguno |
| Precio válido (HU-M1-01 CA 5, HU-M1-04 CA 5) | 7 → 10 | ninguno |
| Ingredientes obligatorios y sin repetidos (HU-M1-01 CA 6, HU-M1-04 CA 6) | 7 → 10 | ninguno |
| Descripción opcional (HU-M1-01 CA 7, HU-M1-04 CA 7) | 4 → 6 | ninguno |
| Sin secciones habilitadas (HU-M1-01 CA 8, HU-M1-04 CA 8) | 3 → 4 | ninguno |
| Sección habilitada y existente (HU-M1-01 CA 9, HU-M1-04 CA 9) | 6 → 9 | ninguno |
| Imagen válida por contenido (HU-M1-01 CA 10, HU-M1-04 CA 10) | 9 → 13 | ninguno |
| Elegir imagen de archivo o cámara (HU-M1-01 CA 11, HU-M1-04 CA 11) | 5 → 7 | ninguno |
| HEIC se guarda como JPEG (HU-M1-01 CA 12, HU-M1-04 CA 12) | 5 → 7 | ninguno |
| Etiquetas opcionales y sin repetidas (HU-M1-01 CA 13, HU-M1-04 CA 13) | 8 → 12 | ninguno |
| Alta sin datos opcionales (HU-M1-01 CA 14, HU-M1-04 CA 14) | 4 → 6 | ninguno |
| Estado asignado por el sistema | 4 → 6 | ninguno |
| Atomicidad del alta | 2 → 3 | ninguno |
| Listar los productos con su detalle (HU-M1-13 CA 1) | 3 → 4 | ninguno |
| Enlace de editar en platos y postres (HU-M1-13, S27, S31) | 3 → 3 | «Bebidas sin acciones» |
| Dar de baja desde la fila de platos y postres (HU-M1-13, S28, E13, S31) | 7 → 10 | ninguno |

Escenario no conservado: «Bebidas sin acciones» («ENTONCES no ofrece «Editar» ni «Dar de baja»»). Se eliminó porque el delta lo retira de forma explícita (nota de `## Supuestos` del delta) y contradice la regla nueva: las filas de bebidas ofrecen «Editar» y, si están habilitadas, «Dar de baja» (S45). Lo sustituyen «Editar una bebida» y los tres escenarios de baja desde la fila de la bebida.

Los encabezados de «Ingredientes obligatorios y sin repetidos», «Enlace de editar en platos y postres» y «Dar de baja desde la fila de platos y postres» quedan sin cambios aunque ahora cubren también a las bebidas, porque `MODIFIED` exige el encabezado exacto.

### Otros cambios en la spec principal

- Propósito: alta, consulta, modificación (incluida la reactivación) y baja de los platos, postres y bebidas. Se quitó la frase futura «y las bebidas (HU-M1-07) harán lo mismo»; ahora dice que los postres (HU-M1-04 y HU-M1-05-06) y las bebidas (HU-M1-07-08-09) solo agregan sus rutas y sus esquemas, y que las bebidas tienen los ingredientes opcionales (S44). Línea de origen: «Origen: HU-M1-01, HU-M1-04, HU-M1-02-03-13, HU-M1-05-06 y HU-M1-07-08-09 (archivados 2026-10-26)».
- Supuestos: se agregaron al final las 4 líneas `Supuesto:` del delta, textuales (S42 a S46, S47, S48, y «S1 a S12, S14, S15, S18 a S25, S29 y S34 rigen para bebidas; S27 deja de regir (S45)»), y una línea para S55 a S57, que vienen de `design.md` y no del delta. La línea de S15 a S28 de HU-M1-02-03-13 pasó de «(S27, para postres, reemplazado por S31)» a «(S27 reemplazado por S31 para postres y por S45 para bebidas)».
- La «Nota:» del delta sobre la ausencia de bloque `REMOVED` es propia del delta y no se copió; sigue en el delta archivado.

### Conteos

| Fuente | Requisitos | Escenarios |
| --- | --- | --- |
| Spec principal antes del archivo | 54 | 207 |
| Delta de HU-M1-07-08-09 | 32 | 182 |
| Fuentes sumadas | 86 | 389 |
| Reemplazados por `MODIFIED` (versión anterior) | −17 | −88 |
| Requisito del contrato volcado a la sección del contrato | −1 | −2 |
| Spec principal después del archivo | 68 | 299 |

Detalle de escenarios: 207 − 88 (escenarios anteriores de los 17 requisitos reemplazados) + 126 (escenarios `MODIFIED` del delta) + 54 (escenarios `ADDED` sin el contrato) = 299. De los 88 escenarios anteriores, 87 reaparecen idénticos en el delta y 1 («Bebidas sin acciones») se eliminó a propósito.

## Estado final de la spec principal

`openspec/specs/carta-productos/spec.md`: 68 requisitos y 299 escenarios, sin encabezados de requisito repetidos ni encabezados de escenario repetidos dentro de un mismo requisito. Contrato con 15 filas, una por ruta.

## Trazabilidad de artefactos (modo openspec)

Rutas en el archivo:

- `proposal.md`, `design.md`, `tasks.md`, `apply-progress.md`, `verify-report.md`
- `specs/carta-productos/spec.md`

No hay `exploration.md` en este cambio.

## Verificación mecánica

Conteo de requisitos y escenarios (la lista final es de encabezados de escenario repetidos dentro de un mismo requisito):

```
main-before-070809.md requisitos 54 escenarios 207 dups []
HU-M1-07-08-09/specs/carta-productos/spec.md requisitos 32 escenarios 182 dups []
openspec/specs/carta-productos/spec.md requisitos 68 escenarios 299 dups []
```

Cobertura de escenarios (cada cuerpo de escenario de las fuentes buscado textual en la spec principal nueva):

```
target 299 scenarios
source scenarios 389 distinct bodies 297
EXACT DUP: 87 pares principal/delta del mismo requisito y escenario (los conservados por MODIFIED)
EXACT DUP: «Ingredientes vacíos o repetidos» (plato y postre)
EXACT DUP: «Etiquetas y descripción inválidas» (plato, postre y bebida)
EXACT DUP: «Error indicado en el formulario» (plato, postre y bebida)
MISSING: «Enlace de editar en platos y postres», «Bebidas sin acciones» (eliminado a propósito)
MISSING: «Contrato de la API de bebidas», «Rutas de bebidas disponibles» (contrato fuera de los requisitos)
MISSING: «Contrato de la API de bebidas», «Error con formato de la API» (contrato fuera de los requisitos)
```

Los duplicados exactos entre requisitos distintos se conservan en cada requisito: 297 cuerpos distintos − 3 ausentes + 5 copias en requisitos distintos = 299.

Contrato: las 4 filas y las 6 viñetas del requisito del contrato del delta (líneas 13 a 16 y 20 a 25) se buscaron textuales en la spec principal; todas coinciden. Las 4 líneas `Supuesto:` del delta también.

Notas de reemplazo y redacción futura: `grep -n 'Reemplaza a\|Previously\|harán lo mismo' openspec/specs/carta-productos/spec.md` sin salida.

Encabezados de requisito repetidos: `grep '^### Requisito' openspec/specs/carta-productos/spec.md | sort | uniq -d` sin salida.

Movimiento con `git mv` a `openspec/changes/archive/2026-10-26-HU-M1-07-08-09`, comparado contra una instantánea tomada antes del movimiento:

```
diff -r snap-070809 openspec/changes/archive/2026-10-26-HU-M1-07-08-09
exit=0
```

Este reporte se agregó después de la comparación y no forma parte de ella.

## Notas

- Ningún artefacto archivado fue modificado.
- El cambio queda cerrado. El siguiente archivo de la secuencia es HU-M1-11-12.

## Riesgos

1. Advertencias W1 y W2 y la sugerencia 4 del verify-report siguen sin evidencia de corrección en el repositorio.
2. Los encabezados «Ingredientes obligatorios y sin repetidos», «Enlace de editar en platos y postres» y «Dar de baja desde la fila de platos y postres» ya no describen todo su alcance (las bebidas tienen ingredientes opcionales y también ofrecen editar y dar de baja). Un próximo cambio puede renombrarlos con un bloque `RENAMED` o `MODIFIED`.
3. La baja de una bebida incluida en un menú vigente (S20) queda por validar con M2.
