```yaml
schema: gentle-ai.verify-result/v1
verdict: pass
blockers: 0
critical_findings: 0
requirements: 1/1
scenarios: 6/6
acceptance_criteria: 2/2
test_command: "backend: ruff check . && ruff format --check . && lint-imports && pytest | frontend: npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build"
test_exit_code: 0
build_command: "frontend: npm run build"
build_exit_code: 0
```

# Informe de verificación: HU-M3-03 (eliminar un sector)

- **Veredicto: PASS** (0 CRITICAL, 0 WARNING)
- **Cambio:** `HU-M3-03` · **Rama:** `feature/HU-M3-03-eliminar-sector` · **Modo:** Strict TDD · **Persistencia:** OpenSpec.
- **Alcance verificado:** issue #35, CA 1 y 2. Spec: 1 requisito y 6 escenarios.

## 1. Completitud de tareas

`tasks.md`: las tareas de las fases 1 a 3 están marcadas `[x]`, 0 pendientes. Coinciden con `apply-progress.md`.

## 2. Ejecución de la CI (AGENTS.md §7)

| Lado | Comando | Resultado |
| --- | --- | --- |
| Backend | `ruff check . && ruff format --check . && lint-imports && pytest` | Exit 0: 10 contratos cumplidos y 0 rotos, `630 passed`, cobertura 99,56 % (umbral 70 %) |
| Frontend | `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` | Exit 0: lint sin errores ni advertencias, Prettier y `tsc --noEmit` correctos, cobertura global 76,68 % de líneas (umbral 60 %), build correcto |

## 3. Criterios de aceptación

| CA | Escenario | Evidencia | Resultado |
| --- | --- | --- | --- |
| 1 de #35 | Existe un sector y confirmo su eliminación → deja de estar disponible | `test_dar_de_baja_sector_responde_200_y_deja_de_estar_disponible`, `test_dar_de_baja_sector_lo_deshabilita_y_conserva_los_datos`, `SalonPage.test` «elimina el sector con confirmación y recarga el listado» | OK |
| 2 de #35 | El sector tiene mesas → se informa que no puede eliminarse | `test_dar_de_baja_sector_con_mesas_responde_409_y_conserva_todo`, `SalonPage.test` «con mesas asociadas muestra el mensaje del backend y conserva la fila» | OK |

## 4. Escenarios de la spec

| Escenario | Evidencia | Resultado |
| --- | --- | --- |
| Eliminar un sector existente | `test_dar_de_baja_sector_*` y `test_dar_de_baja_sector_lo_quita_de_los_habilitados` | OK |
| Confirmación en el listado | `useBajaSector.test` (textos y variante `danger`) | OK |
| Cancelar la eliminación | `useBajaSector.test` «al cancelar no envía nada»; `SalonPage.test` | OK |
| Sector con mesas asociadas | `test_dar_de_baja_sector_con_mesas_*` y toast con el `detalle` | OK |
| Sector ya deshabilitado | `test_dar_de_baja_sector_ya_deshabilitado_*`; la fila no ofrece «Eliminar» | OK |
| Sector inexistente | `test_dar_de_baja_sector_inexistente_*` | OK |

## 5. Riesgos residuales

- La reactivación queda fuera del cambio (`Supuesto:` S1 confirmado): un sector dado de baja no se puede volver a habilitar desde la aplicación. Queda anotado para el PR.
- La rama está apilada sobre HU-M3-02-04; el PR no debe integrarse antes que su base.
