# Reporte de archivo: HU-M1-04 (Crear un postre)

**Fecha de cierre**: 2026-10-26
**Modo de artefactos**: openspec
**Issue**: #6 · **PR**: #178 (integrado en `develop` el 2026-10-25, merge commit `9bc9a74`)
**Carpeta archivada**: `openspec/changes/archive/2026-10-26-HU-M1-04/`
**Spec principal modificada**: `openspec/specs/carta-productos/spec.md`
**Orden de archivo**: segundo de cuatro (HU-M1-01, HU-M1-04, HU-M1-02-03-13, HU-M1-05-06).

## Estado final al cierre

Fuentes y jerarquía aplicada (de mayor a menor autoridad):

1. Estado de revisión nativa: no se usó compuerta de revisión. El desarrollo guiado por recibos está desactivado y el cambio se cierra bajo la política ordinaria del repositorio. No existe `reviewGate`.
2. Artefacto de tareas (`tasks.md`): 24 de 24 tareas marcadas `[x]`, 0 sin marcar (`grep -c "^- \[ \]"` devuelve 0).
3. Hechos de cierre: el issue #6 se entregó en el PR #178, integrado en `develop` el 2026-10-25 con el merge commit `9bc9a74`. Verificado con `git merge-base --is-ancestor 9bc9a74 develop`: es ancestro de `develop`.
4. Instantáneas intermedias (`verify-report.md`, `apply-progress.md`): se citan como historial del momento en que se escribieron, no como estado actual.

### Conciliación de la tarea 5.5

La tarea 5.5 («Commit 5 solo si hay artefactos de SDD por versionar: `docs: agrega los artefactos de SDD de HU-M1-04 (HU-M1-04)`») figuraba `[ ]` en `tasks.md`, y el verify-report la anotaba como «abierta por diseño; todavía no hay nada commiteado». Se concilió a `[x]` antes del archivo, con autorización: el commit `c4fa37c` es ancestro de `develop` (`git merge-base --is-ancestor c4fa37c develop`) y se entregó con el PR #178. Es la única modificación de un artefacto archivado; el resto de la carpeta se movió sin cambios.

### Veredicto de verificación

Fuente: `openspec/changes/archive/2026-10-26-HU-M1-04/verify-report.md` (`evidence_revision` `sha256:edf5f19e2889baec99884ebc8e3253b53238d4729a0353f9d0851f2987428fc7`), escrito en el momento de la verificación.

- Veredicto: PASS WITH WARNINGS. Blockers: 0. Hallazgos CRITICAL: 0.
- Requisitos 17/17; escenarios 46/46 (43 con prueba directa y 3 indirectos, ver W1 a W3).
- Cifras de prueba a la fecha de la verificación: backend `pytest` 222 aprobadas, cobertura 99,37 %; frontend `vitest` 159 aprobadas en 19 archivos, líneas 73,66 %; `npm run build` correcto; `alembic heads` con una sola cabeza, sin migración nueva.

### Advertencias del verify-report y su estado al cierre

| Advertencia (verify-report, en el momento de la verificación) | Estado al cierre |
| --- | --- |
| W1. «Falla el commit» se prueba solo a nivel de `service` para platos, no por `POST /postres` | Sin evidencia de corrección posterior. El `service` es genérico por categoría. |
| W2. «Nombre de un postre deshabilitado» y «100 caracteres con números» sin prueba de `router` propia del postre | Sin evidencia de corrección posterior. Cobertura indirecta conocida. |
| W3. Escenarios de pantalla (rechazo de 6 MB, vista previa, HEIC, precio con coma, chips de etiquetas) probados en componentes genéricos, no en la página de postre | Sin evidencia de corrección posterior. Cobertura indirecta conocida. |

Sugerencias del verify-report (S1 y S2), informativas y sin bloqueo: comprobar la URL final tras la redirección de `/productos/nuevo`; rama `ingredientesObligatorios` en `false` sin categoría que la use.

## Sincronización de specs

| Dominio | Acción | Detalle |
| --- | --- | --- |
| `carta-productos` | Modificada (fusión) | Delta solo con `ADDED`. 14 requisitos del delta tienen el mismo encabezado que un requisito de la spec principal y enuncian la misma regla para postres: se fusionaron en un requisito por regla que cubre ambas categorías. 3 requisitos con encabezado nuevo se agregaron junto a su par del alta. Ningún requisito se eliminó. |

### Requisitos fusionados (mismo encabezado, regla generalizada a platos y postres)

En cada uno se generalizó el cuerpo («el plato o el postre», `POST /platos` y `POST /postres`), se conservaron todos los escenarios de ambas fuentes y se agregó « (postre)» al encabezado del escenario del delta cuando habría coincidido con uno de la spec principal. El encabezado cita los dos criterios de aceptación, que tienen el mismo número en ambas HU.

| Requisito en la spec principal | Escenarios principal + delta = final |
| --- | --- |
| Campos obligatorios (HU-M1-01 CA 2, HU-M1-04 CA 2) | 4 + 3 = 7 |
| Largo del nombre (HU-M1-01 CA 4, HU-M1-04 CA 4) | 2 + 2 = 4 |
| Precio válido (HU-M1-01 CA 5, HU-M1-04 CA 5) | 4 + 3 = 7 |
| Ingredientes obligatorios y sin repetidos (HU-M1-01 CA 6, HU-M1-04 CA 6) | 4 + 3 = 7 |
| Descripción opcional (HU-M1-01 CA 7, HU-M1-04 CA 7) | 2 + 2 = 4 |
| Sin secciones habilitadas (HU-M1-01 CA 8, HU-M1-04 CA 8) | 2 + 1 = 3 |
| Sección habilitada y existente (HU-M1-01 CA 9, HU-M1-04 CA 9) | 3 + 3 = 6 |
| Imagen válida por contenido (HU-M1-01 CA 10, HU-M1-04 CA 10) | 5 + 4 = 9 |
| Elegir imagen de archivo o cámara (HU-M1-01 CA 11, HU-M1-04 CA 11) | 3 + 3 − 1 duplicado exacto = 5 |
| HEIC se guarda como JPEG (HU-M1-01 CA 12, HU-M1-04 CA 12) | 3 + 2 = 5 |
| Etiquetas opcionales y sin repetidas (HU-M1-01 CA 13, HU-M1-04 CA 13) | 4 + 4 = 8 |
| Alta sin datos opcionales (HU-M1-01 CA 14, HU-M1-04 CA 14) | 2 + 2 = 4 |
| Estado asignado por el sistema | 2 + 2 = 4 |
| Atomicidad del alta | 1 + 1 = 2 |

Detalles propios del postre que se conservan explícitos: el mensaje «El postre ya está registrado» (S13), el botón «Guardar postre», la ruta `/productos/postres/nuevo` y los escenarios del formulario «Nuevo postre».

### Requisitos agregados (encabezado nuevo)

| Requisito | Posición | Escenarios |
| --- | --- | --- |
| Crear postre (HU-M1-04 CA 1) | Después de «Crear plato (HU-M1-01 CA 1)» | 5 |
| Nombre único entre postres (HU-M1-04 CA 3) | Después de «Nombre único entre platos (HU-M1-01 CA 3)» | 3 |
| El alta de platos no cambia (regresión) | Al final del grupo del alta | 3 |

### Otros cambios en la spec principal

- Título: `# Especificación de carta-productos`, sin el identificador de una sola HU; la línea de origen lista las HU.
- Encabezados de requisito con criterio de aceptación: `(CA n)` pasó a `(HU-M1-01 CA n)` o `(HU-M1-01 CA n, HU-M1-04 CA n)` para que el número no sea ambiguo entre HU. Es un cambio de rótulo; el cuerpo de los requisitos solo de platos no cambió.
- Propósito: alta de platos y postres; línea de origen «Origen: HU-M1-01 y HU-M1-04 (archivados 2026-10-26)».
- Contrato de la API: fila `POST /postres` (multipart/form-data) → 201 `ProductoSalida`, errores 404, 409, 422. Las viñetas del alta se generalizaron a ambas rutas (partes, `categoria` asignada `PLATO` o `POSTRE`, `ProductoSalida`, orden de validación) y se agregaron «el alta de postres no cambia el esquema» y la viñeta del frontend (rutas por categoría y redirección de `/productos/nuevo`).
- Supuestos: la línea «S1 a S12 de la propuesta rigen sin cambios» y la del delta «S1 a S12 de HU-M1-01 rigen sin cambios para postres» se unieron en una sola («S1 a S12 de la propuesta de HU-M1-01 rigen sin cambios, también para postres (HU-M1-04)»). Se agregaron S13, S14 y el supuesto de rutas del frontend.

### Conteos

| Fuente | Requisitos | Escenarios |
| --- | --- | --- |
| Spec principal antes del archivo | 16 | 47 |
| Delta de HU-M1-04 | 17 | 46 |
| Fuentes sumadas | 33 | 93 |
| Duplicados exactos (mismo texto DADO/CUANDO/ENTONCES) | 14 encabezados fusionados | 1 («HEIC sin vista previa») |
| Spec principal después del archivo | 19 | 92 |

92 escenarios finales = 92 escenarios distintos de las fuentes. El escenario duplicado exacto es «HEIC sin vista previa» de «Elegir imagen de archivo o cámara»: el texto del delta es idéntico al de la spec principal, y el requisito fusionado ya cubre ambos formularios.

## Trazabilidad de artefactos (modo openspec)

Rutas en el archivo:

- `proposal.md`, `design.md`, `tasks.md`, `apply-progress.md`, `verify-report.md`
- `specs/carta-productos/spec.md`

No hay `exploration.md` en este cambio.

## Verificación mecánica

Conteo de requisitos y escenarios por bloque `### Requisito` (script de lectura; la lista final es de encabezados de escenario repetidos dentro de un mismo requisito):

```
main-before-04.md requisitos 16 escenarios 47 dups []
HU-M1-04/specs/carta-productos/spec.md requisitos 17 escenarios 46 dups []
openspec/specs/carta-productos/spec.md requisitos 19 escenarios 92 dups []
```

Cobertura de escenarios: cada cuerpo de escenario (líneas DADO/CUANDO/ENTONCES/Y) de la spec principal previa y del delta se buscó textual en la spec principal nueva:

```
target 92 scenarios
source scenarios 93 distinct bodies 92
EXACT DUP: main y HU-M1-04, «Elegir imagen de archivo o cámara», «HEIC sin vista previa»
(sin líneas MISSING)
```

Encabezados de requisito repetidos: `grep '^### Requisito' openspec/specs/carta-productos/spec.md | sort | uniq -d` sin salida.

Movimiento con `git mv` a `openspec/changes/archive/2026-10-26-HU-M1-04`, comparado contra una instantánea tomada antes del movimiento (ya con la tarea 5.5 conciliada):

```
diff -r snap-04 openspec/changes/archive/2026-10-26-HU-M1-04
exit=0
```

Este reporte se agregó después de la comparación y no forma parte de ella.

## Notas

- Ningún artefacto archivado fue modificado, salvo la conciliación autorizada de la tarea 5.5 en `tasks.md`.
- El cambio queda cerrado. El siguiente archivo de la secuencia es HU-M1-02-03-13.

## Riesgos

1. El requisito «Crear plato (HU-M1-01 CA 1)» sigue nombrando la página `/productos/nuevo`; el requisito de regresión aclara que esa ruta funciona o redirige a `/productos/platos/nuevo`. No es contradictorio, pero un próximo cambio puede unificar la redacción.
2. Advertencias W1 a W3 del verify-report siguen sin evidencia de corrección en el repositorio.
