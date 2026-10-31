```yaml
schema: gentle-ai.verify-result/v1
verdict: pass
blockers: 0
critical_findings: 0
requirements: 1/1
scenarios: 6/6
acceptance_criteria: 3/3
test_command: "backend: ruff check . && ruff format --check . && lint-imports && pytest | frontend: npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build"
test_exit_code: 0
build_command: "frontend: npm run build"
build_exit_code: 0
```

# Informe de verificación: HU-M3-08 (listar las mesas)

- **Veredicto: PASS** (0 CRITICAL, 0 WARNING)
- **Cambio:** `HU-M3-08` · **Rama:** `feature/HU-M3-08-listar-mesas` · **Modo:** Strict TDD · **Persistencia:** OpenSpec.
- **Alcance verificado:** issue #41, CA 1 a 3. Spec: 1 requisito y 6 escenarios.

## 1. Completitud de tareas

`tasks.md`: las tareas de las fases 1 a 3 están marcadas `[x]`, 0 pendientes. Coinciden con `apply-progress.md`.

## 2. Ejecución de la CI (AGENTS.md §7)

| Lado | Comando | Resultado |
| --- | --- | --- |
| Backend | `ruff check . && ruff format --check . && lint-imports && pytest` | Exit 0: 10 contratos cumplidos y 0 rotos, `639 passed`, cobertura 99,56 % (umbral 70 %) |
| Frontend | `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` | Exit 0: lint sin errores ni advertencias, Prettier y `tsc --noEmit` correctos, 45 archivos y 490 pruebas, cobertura global 76,68 % de líneas (umbral 60 %), build correcto |

## 3. Criterios de aceptación

| CA | Escenario | Evidencia | Resultado |
| --- | --- | --- | --- |
| 1 de #41 | Existen mesas → se muestran sus datos | `test_listar_mesas_responde_200_con_la_forma_de_mesa_salida`, `MesasTabla.test` (número, sector, capacidad y estado), `SalonPage.test` «en «Mesas» muestra número, sector, capacidad y estado» | OK |
| 2 de #41 | No existen mesas → se informa | `test_listar_mesas_sin_mesas_responde_pagina_vacia`, `MesasTabla.test` y `SalonPage.test` «sin mesas informa «No hay mesas disponibles»» | OK |
| 3 de #41 | Mesas en distintos sectores → cada una con su sector | `test_listar_mesas_agrupa_por_sector_y_ordena_por_numero`, `MesasTabla.test` «muestra el sector de cada mesa», `SalonPage.test` (Salón principal y Terraza) | OK |

## 4. Escenarios de la spec

| Escenario | Evidencia | Resultado |
| --- | --- | --- |
| Listado con mesas | `test_listar_mesas_devuelve_la_pagina_con_su_sector` y pruebas de presentación | OK |
| Sin mesas registradas | `test_listar_mesas_sin_mesas_devuelve_una_pagina_vacia` y vacío de `MesasTabla` | OK |
| Mesas en distintos sectores | `test_listar_mesas_agrupa_por_sector_y_ordena_por_numero` | OK |
| Paginación | `test_listar_mesas_pagina_sin_cambiar_el_total`, `useMesasDelSalon.test` y `SalonPage.test` «pagina las mesas de a 50» | OK |
| Error de carga | `MesasTabla.test` y `useMesasDelSalon.test` con «Reintentar» | OK |
| Mesa creada desde el salón | `SalonPage.test` «al crear una mesa activa «Mesas» y refresca el listado» | OK |

## 5. Riesgos residuales

- La pestaña «Sectores» queda activa por defecto (la maqueta abre en «Mesas»): diferencia anotada para el PR.
- Sin filtros por sector ni estado ni columna «Mesas» en la pestaña de sectores: fuera del alcance de #41.
- La rama está apilada sobre HU-M3-03/HU-M3-02-04; el PR no debe integrarse antes que su base.
