# Reporte de archivo: HU-M1-14 (Ver la carta)

**Fecha de cierre**: 2026-10-26
**Modo de artefactos**: openspec
**Issue**: #19 (HU-M1-14) · **PR**: #186 (integrado en `develop` el 2026-10-26, merge commit `0e7d192`)
**Carpeta archivada**: `openspec/changes/archive/2026-10-26-HU-M1-14/`
**Spec principal creada**: `openspec/specs/carta-vista/spec.md` (capacidad nueva; no modifica `carta-productos` ni `carta-secciones`)

## Estado final al cierre

Fuentes y jerarquía aplicada (de mayor a menor autoridad):

1. Estado de revisión nativa: no se usó compuerta de revisión. El desarrollo guiado por recibos está desactivado y el cambio se cierra bajo la política ordinaria del repositorio. No existe `reviewGate`.
2. Artefacto de tareas (`tasks.md`): 34 tareas marcadas `[x]` y 0 sin marcar (`grep -c "^- \[ \]"` devuelve 0). Verificado por el orquestador y comprobado en el archivo archivado.
3. Hechos de cierre (indicados por el orquestador y verificados en el repositorio):
   - El issue #19 se entregó en el PR #186, integrado en `develop` con el merge commit `0e7d192` (`git merge-base --is-ancestor 0e7d192 develop`).
   - La advertencia 1 del verify-report se resolvió en el commit `2b91225` («test: cubre las combinaciones de secciones deshabilitadas en la carta (HU-M1-14)»), que es ancestro de `develop`. Ese commit agrega `test_listar_carta_deshabilitados_en_seccion_deshabilitada_solo_trae_los_de_baja` y comprueba los productos de la sección deshabilitada en «Todos». El código no cambió.
4. Instantáneas intermedias (`verify-report.md`, `apply-progress.md`): se citan como historial del momento en que se escribieron, no como estado actual.

### Veredicto de verificación

Fuente: `openspec/changes/archive/2026-10-26-HU-M1-14/verify-report.md`, escrito en el momento de la verificación (`verdict: pass_with_warnings`, `blockers: 0`, `critical_findings: 0`, `requirements: 13/13`, `scenarios: 38/38`).

- Veredicto: PASS WITH WARNINGS. Blockers: 0. Hallazgos CRITICAL: 0.
- Requisitos 13/13; escenarios 38/38. Ninguno `UNTESTED` ni `FAILING`.
- Cifras de prueba a la fecha de la verificación: backend `470 passed`, cobertura 99,43 %, 10 contratos de importación cumplidos; frontend `364 passed` en 32 archivos, líneas 74,78 %; `npm run build` correcto.
- Cifra posterior a la verificación: según la sección «Seguimiento posterior a la verificación» del propio verify-report, el backend pasó a 471 pruebas con 99,43 % de cobertura tras el commit `2b91225`. El frontend no cambió.

### Advertencias del verify-report y su estado al cierre

| Advertencia (verify-report, en el momento de la verificación) | Estado al cierre |
| --- | --- |
| W1. Combinaciones de filtro con cobertura parcial en backend (Deshabilitados con sección deshabilitada con productos mixtos o sin productos; productos de sección deshabilitada en Todos) | Resuelta en el commit `2b91225`. Ver «Seguimiento posterior a la verificación» del verify-report. |
| W2. Reinicio del filtro al volver a entrar a la carta sin prueba propia (escenario «La pantalla abre en Habilitados») | Sin corrección registrada al cierre. No bloqueante; el código usa `useState`, que se reinicia al desmontar. Queda como deuda de cobertura. |
| W3. Caso de solo lectura en verde antes de implementar (Fase 1) | Sin impacto en el resultado: hoy la prueba discrimina porque compara con la ruta real. Sin cambio posterior registrado. |

Sugerencias del verify-report (1 a 4), informativas y sin bloqueo:

- Escenarios de orden y paginación con variante distinta de la pedida (`limit=1&offset=1` en lugar de `limit=2&offset=2`). Sin cambio registrado.
- Texto de las insignias: S93 de la spec dice «Habilitado» o «Deshabilitado», y el diseño (S99) fija «Habilitada» o «Deshabilitada» en secciones. El código sigue S99. La spec archivada no se modificó; queda la discrepancia documentada aquí y en Riesgos.
- Formato de la evidencia de Strict TDD por fase y no por tarea.
- Cobertura del frontend limitada a `src/App.tsx` y `src/shared/**` (decisión del equipo, AGENTS.md §9.8).

## Sincronización de specs

| Dominio | Acción | Detalle |
| --- | --- | --- |
| `carta-vista` | Creada | Capacidad nueva. 13 requisitos y 38 escenarios; 1 fila de contrato; 7 supuestos. Sin requisitos previos que fusionar. |

### Creación de la spec principal

Origen: `openspec/changes/archive/2026-10-26-HU-M1-14/specs/carta-vista/spec.md` (el delta, copiado con `cp` a `openspec/specs/carta-vista/spec.md`). Únicas ediciones, hechas con `sed` y no con reescritura del modelo:

1. Se eliminó el encabezado `## ADDED Requirements` y su línea en blanco. El resto del contenido (requisitos, escenarios, fila de contrato y supuestos) quedó intacto.
2. La línea de origen de Propósito pasó a «Origen: HU-M1-14 (archivado 2026-10-26). Capacidad nueva; no modifica `carta-productos` ni `carta-secciones`.»

Readback de la creación (`diff` entre el delta archivado y la spec principal):

```
7,9c7
< Origen: HU-M1-14 (issue #19). Capacidad nueva; no modifica `carta-productos` ni `carta-secciones`.
< 
< ## ADDED Requirements
---
> Origen: HU-M1-14 (archivado 2026-10-26). Capacidad nueva; no modifica `carta-productos` ni `carta-secciones`.
```

Sin otras diferencias. Comprobación de encabezados `## ` y `### `: todos tienen línea en blanco antes (sin salida en el `awk` de control).

### Conteo por requisito (spec principal)

| Requisito | Escenarios |
| --- | --- |
| Carta por secciones con sus productos (HU-M1-14 CA 1) | 6 |
| Filtro inicial en Habilitados (HU-M1-14 CA 2) | 3 |
| Ocultar secciones sin productos habilitados (HU-M1-14 CA 3) | 2 |
| Filtro Deshabilitados (HU-M1-14 CA 4) | 4 |
| Filtro Todos (HU-M1-14 CA 5) | 3 |
| Orden estable de las secciones (HU-M1-14, S85) | 2 |
| Paginación por sección (HU-M1-14, S80) | 5 |
| Estado inválido (HU-M1-14, S79) | 2 |
| Carta de solo lectura sin efectos (HU-M1-14, S79) | 1 |
| Entrada «Ver carta» y ruta (HU-M1-14, S87) | 2 |
| Filtro de estado en la pantalla (HU-M1-14 CA 2, 4 y 5) | 2 |
| Navegación por secciones (HU-M1-14, S87) | 2 |
| Estados vacíos y error (HU-M1-14, S88) | 4 |
| **Total** | **13 requisitos, 38 escenarios** |

Encabezados de requisito repetidos: ninguno (`uniq -d` sin salida). Encabezados `ADDED` restantes: ninguno.

## Estado final de la spec principal

`openspec/specs/carta-vista/spec.md`: 13 requisitos, 38 escenarios, 1 fila de contrato (`GET /carta?estado&limit&offset`), 7 supuestos (S79 a S89 como línea agregada; S90 a S95 individuales).

## Trazabilidad de artefactos (modo openspec)

Rutas en el archivo:

- `proposal.md`, `design.md`, `tasks.md`, `apply-progress.md`, `verify-report.md`
- `specs/carta-vista/spec.md` (delta, sin modificar)

No hay `exploration.md` en este cambio.

Observaciones de Engram: no se consultaron. Las herramientas de Engram no estaban disponibles en esta sesión, así que no se registraron IDs de observación ni se ejecutó `mem_save`. La fuente de verdad de este cambio en modo openspec son los archivos listados arriba.

## Verificación mecánica

Movimiento con `git mv` de `openspec/changes/HU-M1-14` a `openspec/changes/archive/2026-10-26-HU-M1-14`, comparado contra una instantánea tomada antes del movimiento (`cp -R` a la carpeta de scratchpad de la sesión, `snap-HU-M1-14`):

```
diff -r <scratchpad>/snap-HU-M1-14 openspec/changes/archive/2026-10-26-HU-M1-14
(sin salida)  exit=0
```

Confirmaciones: `openspec/changes/HU-M1-14` ya no existe; `openspec/changes/` contiene solo `archive/`. Este reporte se agregó después de la comparación y no forma parte de ella.

## Notas

- Ningún artefacto archivado fue modificado.
- No queda ningún cambio activo en `openspec/changes/`.
- Se crearon `openspec/specs/carta-vista/spec.md` (nuevo) y este reporte. No se modificó ninguna otra spec principal.

## Riesgos

1. Las advertencias W2 y W3 del verify-report no tienen corrección registrada al cierre. No bloquean el archivado, pero siguen abiertas como deuda de cobertura de pruebas.
2. Discrepancia de texto: S93 (spec) fija «Habilitado»/«Deshabilitado» para secciones y productos; S99 (diseño) y el código usan «Habilitada»/«Deshabilitada» en secciones. La spec principal conserva S93 sin cambios. Conviene que el equipo la corrija en una HU posterior.
3. La sugerencia 1 del verify-report (tarea 4.3, «Deshabilitado») no se corrigió en el artefacto archivado, por ser archivo de auditoría.
4. No se pudieron registrar observaciones ni `mem_save` por indisponibilidad de Engram en esta sesión.
