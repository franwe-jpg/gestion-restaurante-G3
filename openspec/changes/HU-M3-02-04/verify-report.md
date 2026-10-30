```yaml
schema: gentle-ai.verify-result/v1
verdict: pass
blockers: 0
critical_findings: 0
requirements: 2/2
scenarios: 17/17
acceptance_criteria: 7/7
test_command: "backend: ruff check . && ruff format --check . && lint-imports && pytest | frontend: npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build"
test_exit_code: 0
build_command: "frontend: npm run build"
build_exit_code: 0
```

# Informe de verificación: HU-M3-02 y HU-M3-04 (modificar y listar sectores)

- **Veredicto: PASS** (0 CRITICAL, 0 WARNING)
- **Cambio:** `HU-M3-02-04` · **Rama:** `feature/HU-M3-02-04-modificar-listar-sector` (2 commits de código: `ac3bae7` y `7efc40d`) · **Modo:** Strict TDD · **Persistencia:** OpenSpec.
- **Alcance verificado:** issues #34 (HU-M3-02) y #36 (HU-M3-04), CA 1 a 4 y 1 a 3. Spec: 2 requisitos y 17 escenarios.

## 1. Completitud de tareas

`tasks.md`: las 18 tareas de las fases 1 a 3 están marcadas `[x]`, 0 pendientes. Coinciden con `apply-progress.md`.

## 2. Ejecución de la CI (AGENTS.md §7)

| Lado | Comando | Resultado |
| --- | --- | --- |
| Backend | `ruff check . && ruff format --check . && lint-imports && pytest` | Exit 0: `All checks passed!`, `76 files already formatted`, 10 contratos cumplidos y 0 rotos, `618 passed`, cobertura 99,55 % (umbral 70 %) |
| Frontend | `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` | Exit 0: lint con 0 errores y 0 advertencias, Prettier correcto, `tsc --noEmit` correcto, 42 archivos y 464 pruebas, cobertura global 76,68 % de líneas (umbral 60 %), build correcto |

`alembic heads`: sin migración nueva; el cambio no toca el esquema.

## 3. Trazabilidad (criterio, escenario, prueba)

Backend: `backend/tests/modules/salon/{test_schemas,test_service,test_router}.py`. Frontend: `frontend/src/modules/salon/{api.test.ts,components/useFormularioSector.test.tsx,components/SectorFormDialog.test.tsx,components/SectoresTabla.test.tsx,components/useSectoresDelSalon.test.tsx,pages/SalonPage.test.tsx}`.

| Criterio / escenario | Prueba | Resultado |
| --- | --- | --- |
| CA 1 de #34: guardar valores válidos | `test_modificar_sector_cambia_el_nombre_y_la_descripcion`, `test_modificar_sector_responde_200_con_la_forma_de_sector_salida`, `SalonPage.test` «guarda la modificación, cierra el diálogo y recarga la tabla» | OK |
| CA 2 de #34: dato obligatorio vacío | Parametrizado de `test_modificar_sector_con_datos_invalidos_responde_422_sin_guardar` (nombre vacío y solo espacios), `SectorFormDialog.test` «con los campos vacíos no envía y marca el nombre», `SalonPage.test` «con el nombre vacío no guarda y la fila conserva el nombre» | OK |
| CA 3 de #34: nombre de otro sector | `test_modificar_sector_rechaza_el_nombre_de_otro_sin_distinguir_mayusculas`, `test_modificar_sector_con_nombre_de_otro_responde_409_sin_cambios`, `test_modificar_sector_con_nombre_de_un_deshabilitado_responde_409`, `useFormularioSector.test` «409 bajo Nombre», `SalonPage.test` «con el nombre de otro sector muestra el 409 bajo Nombre» | OK |
| CA 4 de #34: cancelar | `SectorFormDialog.test` «al cancelar cierra sin enviar», `SalonPage.test` «al cancelar no envía nada y la fila mantiene sus datos» | OK |
| Mismo nombre con otra descripción | `test_modificar_sector_con_el_mismo_nombre_solo_cambia_la_descripcion`, `test_modificar_sector_con_el_mismo_nombre_solo_cambia_la_descripcion` (router) | OK |
| Sector inexistente | `test_modificar_sector_inexistente_es_no_encontrado`, `test_modificar_sector_inexistente_responde_404` | OK |
| Sector deshabilitado | `test_modificar_sector_deshabilitado_conserva_su_estado`, `test_modificar_sector_deshabilitado_conserva_el_estado` | OK |
| Estado enviado en el cuerpo | Parametrizado de `test_modificar_sector_con_datos_invalidos_responde_422_sin_guardar` (`estado` extra) y de `test_sector_modificar_rechaza_campos_desconocidos` | OK |
| Límites de longitud | `test_sector_modificar_exige_el_nombre`, `test_sector_modificar_recorta_y_mide_el_nombre`, `test_sector_modificar_recorta_la_descripcion_y_rechaza_201`, parámetros equivalentes en router; `SectorFormDialog.test` «31 caracteres no envía» | OK |
| Nombre recortado | `test_sector_modificar_recorta_el_nombre`, `test_modificar_sector_recorta_el_nombre` | OK |
| Descripción ausente | `test_modificar_sector_sin_descripcion_la_deja_en_none`, `test_modificar_sector_sin_descripcion_la_deja_en_null` | OK |
| `IntegrityError` en `commit` | `test_modificar_sector_convierte_la_carrera_en_conflicto_y_deshace` (rollback observado) | OK |
| CA 1 de #36: listado con sectores | `SectoresTabla.test` «muestra nombre, descripción y estado de cada sector», `SalonPage.test` «muestra la tabla con los datos de los sectores» | OK |
| CA 2 de #36: listado vacío | `SectoresTabla.test` «con el listado vacío informa "No hay sectores disponibles"», `SalonPage.test` «sin sectores informa "No hay sectores disponibles"» | OK |
| CA 3 de #36: varios sectores | `SalonPage.test` «muestra los sectores ordenados por nombre», `test_listar_sectores_sin_filtro_devuelve_todos_ordenados_por_nombre` | OK |
| Editar desde la fila | `SectoresTabla.test` «entrega el sector al presionar "Editar «nombre»"», `SalonPage.test` «abre el diálogo precargado desde la fila» | OK |
| Paginación | `useSectoresDelSalon.test` (primera página, total, cambio de página, recarga, error), `SalonPage.test` «muestra los controles y pide la página siguiente con offset 50» | OK |
| Error de carga | `SectoresTabla.test` y `SalonPage.test` con «Reintentar» | OK |
| Regresión del alta y de la mesa | Suite completa de backend y frontend; `SalonPage.test` conserva «Nuevo sector», «Nueva mesa» y el atajo «Crear sector» | OK |

## 4. Observaciones

- No se tocó código compartido: `clienteHttp.put` ya existía desde HU-M1-02, así que `frontend/src/shared/api/client.ts` no cambió. `design.md` preveía agregarlo; la diferencia se anota en el PR.
- Sin migración ni cambios en `models.py`, `backend/app/shared/`, `main.py` ni `App.tsx`.
- Diferencias con la maqueta: sin columna «Mesas» (HU-M3-08), sin acción de baja (HU-M3-03) y sin pestañas, filtros ni búsqueda. La acción de edición es un botón con ícono y nombre accesible «Editar «nombre»».
- Punto de control de revisión: backend 427 líneas y frontend 932; el frontend supera las 800 y se integra en un solo PR (AGENTS.md §4).
- Evaluación de riesgo de RDD: `medium`, `review_due=false`, motivo `under_budget`.
