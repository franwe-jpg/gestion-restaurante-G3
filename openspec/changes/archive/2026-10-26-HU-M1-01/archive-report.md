# Reporte de archivo: HU-M1-01 (Crear un plato)

**Fecha de cierre**: 2026-10-26
**Modo de artefactos**: openspec
**Issue**: #2 · **PR**: #177 (integrado en `develop` el 2026-10-25, merge commit `69bdb2c`)
**Carpeta archivada**: `openspec/changes/archive/2026-10-26-HU-M1-01/`
**Spec principal creada**: `openspec/specs/carta-productos/spec.md`
**Spec principal modificada**: `openspec/specs/carta-secciones/spec.md` (requisito «Listar secciones»)
**Orden de archivo**: primero de cuatro (HU-M1-01, HU-M1-04, HU-M1-02-03-13, HU-M1-05-06). Los cambios siguientes agregarán deltas a la misma spec principal `carta-productos`.

## Estado final al cierre

Fuentes y jerarquía aplicada (de mayor a menor autoridad):

1. Estado de revisión nativa: no se usó compuerta de revisión. El desarrollo guiado por recibos está desactivado y el cambio se cierra bajo la política ordinaria del repositorio. No existe `reviewGate` ni artefactos `sdd/HU-M1-01/review/*`.
2. Artefacto de tareas (`tasks.md`): 28 de 28 tareas marcadas `[x]`, 0 sin marcar. Verificado con `grep` antes de sincronizar las specs y en la carpeta archivada.
3. Hechos de cierre explícitos en el prompt de lanzamiento: el issue #2 se entregó en el PR #177, integrado en `develop` el 2026-10-25 con el merge commit `69bdb2c`. Verificado con `git merge-base --is-ancestor 69bdb2c develop`: es ancestro de `develop`.
4. Instantáneas intermedias (`verify-report.md`, `apply-progress.md`): se citan como historial del momento en que se escribieron, no como estado actual.

### Veredicto de verificación

Fuente: `openspec/changes/archive/2026-10-26-HU-M1-01/verify-report.md` (`evidence_revision` `sha256:e47de2bed7ddeab2afa1c06c78e46bce0886f6652e85be75052a2c5025e5d5e1`), escrito en el momento de la verificación.

- Veredicto: PASS WITH WARNINGS. Blockers: 0. Hallazgos CRITICAL: 0.
- Requisitos 17/17 (16 de `carta-productos`, 1 de `carta-secciones`); escenarios 52/52 (47 cubiertos por completo y 5 parciales, contados como completos por el validador).
- Cifras de prueba a la fecha de la verificación: backend `pytest` 178 aprobadas, cobertura 99,36 %; frontend `test:coverage` 129 aprobadas, líneas globales 73,66 %; `npm run build` y `alembic heads` correctos. No se encontró en el repositorio evidencia posterior que cambie estas cifras.

### Advertencias del verify-report y su estado al cierre

Las advertencias se atribuyen a `verify-report.md`, escrito en el momento de la verificación. El prompt de lanzamiento no informa correcciones posteriores y no se encontró evidencia de ellas en el repositorio; por eso figuran como abiertas al cierre, salvo que se indique lo contrario.

| Advertencia (verify-report, en el momento de la verificación) | Estado al cierre |
| --- | --- |
| W1. Escenarios sin prueba a nivel HTTP: «Alta con HEIC», «Imagen servida tras guardar», «Faltan sección y precio» juntos, «Nombre de 100 caracteres con números» en POST y «Quitar un chip» | Sin evidencia de corrección posterior. Quedan como cobertura parcial conocida. |
| W2. `pip-audit` no se ejecutó; tres dependencias nuevas sin auditar (RNF-SEG-10) | Sin evidencia de ejecución posterior. Pendiente de confirmar por el equipo. |
| W3. No verificado en navegador real, cámara de teléfono ni HEIC de iPhone | Sin evidencia de verificación posterior. Pendiente de prueba manual. |
| W4. Tamaño del cambio: backend ≈ 1 581 y frontend ≈ 1 658 líneas, sobre el punto de control de 800 | Informativo. PR único por HU (AGENTS.md, sección 4). |

Sugerencias del verify-report (S-a a S-e), informativas y sin bloqueo: envoltura de escritura de `imagenes.guardar`; ruta relativa de `MEDIA_DIR`; carga completa del upload antes del router; aviso a M2, M4 y M6 por el índice compartido y el cambio en `Producto`; medición de cobertura de `modules/` en el frontend.

## Sincronización de specs

| Dominio | Acción | Detalle |
| --- | --- | --- |
| `carta-productos` | Creada | Capacidad nueva. No existía spec principal. Se copió el delta con `cp` y se aplicaron tres cambios de formato por `sed`: se eliminó el encabezado `## ADDED Requirements` junto con su línea en blanco, se agregó la línea de origen bajo Propósito y `## Supuestos nuevos` pasó a `## Supuestos`. Ningún requisito, escenario, fila de contrato ni supuesto cambió. 16 requisitos, 47 escenarios. |
| `carta-secciones` | Modificada | Se reemplazó el bloque «Requisito: Listar secciones» por el texto del delta, sin la línea «(Previously: ...)» y con la línea «Contrato:». Se conservan los demás requisitos y el resto del archivo. Operación de un solo requisito: 1 modificado, 0 agregados, 0 eliminados. |

Notas sobre la sincronización:

- El delta de `carta-productos` no tiene `MODIFIED`, `REMOVED` ni `RENAMED`; no hay operaciones destructivas.
- En `carta-secciones`, la tabla de `## Contrato de la API` sigue mostrando `GET /secciones?limit&offset`. El requisito modificado sí incluye `estado`. Esa tabla no es un requisito y no estaba en el alcance indicado, por lo que no se tocó. Ver Riesgos.

## Trazabilidad de artefactos (modo openspec)

Los artefactos son archivos, no observaciones de Engram. Rutas en el archivo:

- `proposal.md`, `exploration.md`, `design.md`, `tasks.md`, `apply-progress.md`, `verify-report.md`
- `specs/carta-productos/spec.md`
- `specs/carta-secciones/spec.md`

Observaciones de Engram: no se registraron IDs. Las herramientas de Engram no estaban disponibles en la ejecución de esta fase; los archivos del disco fueron la única fuente, según la sección de modo openspec.

## Verificación mecánica

Paso 2a (spec principal `carta-productos`: `cp` del delta, después `sed` de tres líneas). Salida de `diff -r` entre el delta (origen) y la spec principal (destino). Las únicas diferencias son las tres intencionales:

```
7c7
< ## ADDED Requirements
---
> Origen: HU-M1-01 (archivado 2026-10-26)
385c385
< ## Supuestos nuevos
---
> ## Supuestos
exit=1
```

Paso 2b (spec principal `carta-secciones`, reemplazo del bloque «Listar secciones» con `awk` sobre copia previa). Salida de `diff -r` entre la copia previa y la nueva spec principal (solo el bloque reemplazado):

```
200c200,203
< `GET /secciones` DEBE devolver todas las secciones, paginadas y ordenadas por `orden` ascendente. La pestaña «Secciones» DEBE mostrar Orden, Nombre, cantidad de productos y Estado.
---
> `GET /secciones` DEBE devolver las secciones, paginadas y ordenadas por `orden` ascendente. El parámetro opcional `estado` (`HABILITADO` o `DESHABILITADO`) PUEDE filtrar el listado; sin él, DEBE devolver todas las secciones, igual que antes. El valor de `estado` fuera del enumerado DEBE responder 422. `total` DEBE contar solo las secciones que cumplen el filtro. La pestaña «Secciones» DEBE mostrar Orden, Nombre, cantidad de productos y Estado.
> 
> 
> Contrato: `GET /secciones?limit&offset&estado` → 200 `Pagina[SeccionRespuesta]`; errores 422.
212a216,233
> 
> #### Escenario: Filtro por estado habilitado
> 
> - DADO dos secciones habilitadas y una deshabilitada
> - CUANDO se hace `GET /secciones?estado=HABILITADO`
> - ENTONCES `items` trae solo las dos habilitadas por `orden` y `total` es 2
> 
> #### Escenario: Estado inválido
> 
> - DADO `estado=ABIERTO`
> - CUANDO se hace `GET /secciones`
> - ENTONCES responde 422
> 
> #### Escenario: Sin filtro no cambia la respuesta
> 
> - DADO secciones habilitadas y deshabilitadas
> - CUANDO se hace `GET /secciones` sin `estado`
> - ENTONCES `items` incluye todas, como antes de esta HU
exit=1
```

Paso 2c (control del bloque: el bloque del delta frente al bloque de la spec principal). Única diferencia: la línea «(Previously: ...)», que se eliminó a propósito. La línea en blanco extra al final corresponde al recorte de la lectura de control, no al archivo:

```
5d4
< (Previously: el listado no admitía filtros; se agrega `estado` opcional y retrocompatible para el selector de sección del alta de platos, HU-M1-01.)
37a37
> 
exit=1
```

Paso 3 (movimiento con `git mv` a `openspec/changes/archive/2026-10-26-HU-M1-01`, comparado contra una instantánea previa al movimiento; el origen quedó eliminado):

```
=== DIFF move (snapshot vs archive) ===
exit=0
```

Sin salida de `diff`: la carpeta archivada es idéntica a la instantánea previa.

Este reporte se agregó después de los `diff -r` y no forma parte de la comparación.

## Notas

- Ningún artefacto archivado fue modificado ni recortado.
- `git mv` dejó en el índice el renombre de la carpeta. Las specs principales (`openspec/specs/carta-productos/spec.md`, cambio en `openspec/specs/carta-secciones/spec.md`) y este reporte no están en el índice.
- No se realizó commit.
- El cambio queda cerrado. Próximo paso: ninguno para este cambio. El siguiente archivo de la secuencia es HU-M1-04.

## Riesgos

1. Tabla de `## Contrato de la API` de `openspec/specs/carta-secciones/spec.md`: la fila `GET /secciones?limit&offset` no incluye el filtro `estado` que agrega el requisito «Listar secciones». Queda desalineada hasta que se actualice esa tabla. Se recomienda un cambio de corrección o un ajuste en el próximo delta de `carta-secciones`.
2. Convención de encabezados: `carta-productos` usa `## Supuestos` (indicado para esta fase). `carta-secciones` conserva `## Supuestos nuevos`, porque no era parte del alcance modificar otros encabezados.
3. Advertencias W1 a W3 del verify-report siguen sin evidencia de corrección en el repositorio (ver tabla de advertencias).
4. Verificación de la conversión: una copia de spec principal distinta del delta no puede tener `diff -r` vacío, porque el encabezado se transformó a propósito. La verificación se hizo con las diferencias listadas arriba, que son exactamente las intencionales.
