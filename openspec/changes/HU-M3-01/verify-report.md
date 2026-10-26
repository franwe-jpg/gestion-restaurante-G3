```yaml
schema: gentle-ai.verify-result/v1
verdict: pass
blockers: 0
critical_findings: 0
requirements: 1/1
scenarios: 9/9
acceptance_criteria: 6/6
test_command: "backend: ruff check . && ruff format --check . && lint-imports && pytest | frontend: npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build"
test_exit_code: 0
build_command: "frontend: npm run build"
build_exit_code: 0
```

# Informe de verificación: HU-M3-01 (Agregar un sector)

- **Veredicto: PASS** (0 CRITICAL, 0 WARNING)
- **Cambio:** `HU-M3-01` · **Rama:** `feature/HU-M3-01-agregar-sector` (3 commits de código: `3017e62`, `e911ae4`, `0262163`) · **Modo:** Strict TDD · **Persistencia:** OpenSpec.
- **Alcance verificado:** issue #33, CA 1 a 6. Spec: 1 requisito y 9 escenarios.

## 1. Completitud de tareas

`tasks.md`: todas las tareas de las fases 1 a 3 marcadas `[x]`, 0 pendientes. Coinciden con `apply-progress.md`.

## 2. Ejecución de la CI (AGENTS.md §7)

| Lado | Comando | Resultado |
| --- | --- | --- |
| Backend | `ruff check . && ruff format --check . && lint-imports && pytest` | Exit 0: `All checks passed!`, `75 files already formatted`, 10 contratos cumplidos y 0 rotos, `390 passed`, cobertura 99,39 % (umbral 70 %) |
| Frontend | `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` | Exit 0: lint con 0 errores y 0 advertencias, Prettier correcto, `tsc --noEmit` correcto, cobertura global 76,48 % de líneas (umbral 60 %), build correcto |

`alembic heads`: una sola cabeza, `f3a5c7e9b1d2`.

## 3. Trazabilidad (criterio, escenario, prueba)

Backend: `backend/tests/modules/salon/{test_schemas,test_service,test_router,test_migracion}.py`. Frontend: `frontend/src/modules/salon/{api.test.ts,components/validarSector.test.ts,components/useFormularioSector.test.tsx,components/SectorFormDialog.test.tsx,pages/SalonPage.test.tsx}`.

| Criterio / escenario | Prueba | Resultado |
| --- | --- | --- |
| CA 1: alta con datos obligatorios | `test_crear_sector_minimo_queda_habilitado`, `test_crear_sector_responde_201_con_la_forma_de_sector_salida`, `useFormularioSector.test` «recorta el nombre, envía la descripción nula, avisa y notifica», `SectorFormDialog.test` «crea el sector y avisa a quien lo abrió» | OK |
| CA 1: alta con descripción | `test_crear_sector_con_descripcion`, `test_crear_sector_con_descripcion_responde_201`, `useFormularioSector.test` «envía la descripción recortada cuando se carga» | OK |
| CA 2: dato obligatorio vacío | `test_crear_sector_con_datos_invalidos_responde_422_sin_guardar[sin-nombre, vacio, solo-espacios]`, `validarSector.test` «pide el nombre cuando está vacío o solo con espacios», `SectorFormDialog.test` «con los campos vacíos no envía y marca el nombre» | OK |
| CA 3: nombre repetido | `test_crear_sector_rechaza_nombre_repetido_sin_distinguir_mayusculas`, `test_crear_sector_compara_con_casefold_no_solo_ascii`, `test_crear_sector_rechaza_nombre_de_un_deshabilitado`, `test_crear_sector_convierte_la_carrera_en_conflicto_y_deshace`, `test_crear_sector_con_nombre_repetido_responde_409_con_detalle`, `useFormularioSector.test` «ubica el 409 bajo Nombre, conserva lo escrito y no cierra» | OK |
| CA 4: cancelar | `SectorFormDialog.test` «al cancelar cierra sin enviar ninguna solicitud», `SalonPage.test` «abre el diálogo de alta y lo cierra sin crear nada al cancelar» | OK |
| CA 5: nombre de 31 caracteres | `test_crear_sector_con_datos_invalidos_responde_422_sin_guardar[31-caracteres]`, `test_crear_sector_con_30_caracteres_responde_201`, `validarSector.test` «rechaza un nombre de 31 caracteres y acepta el de 30» | OK |
| CA 6: estado `HABILITADO` | `test_crear_sector_minimo_queda_habilitado`, `test_crear_sector_responde_201_con_la_forma_de_sector_salida`, `test_crear_sector_con_datos_invalidos_responde_422_sin_guardar[estado]`, `SectorFormDialog.test` «muestra Nombre y Descripción, y el estado fijo Habilitado» | OK |
| Descripción > 200 | `test_crear_sector_con_datos_invalidos_responde_422_sin_guardar[descripcion-201]`, `validarSector.test` «rechaza una descripción de 201 caracteres y acepta la de 200» | OK |
| Nombre recortado | `test_crear_sector_quita_espacios_del_nombre`, `test_crear_sector_responde_201_con_la_forma_de_sector_salida` | OK |
| Migración | `test_upgrade_head_crea_una_sola_cabeza_y_la_tabla_sectores`, `test_upgrade_define_columnas_y_largos`, pruebas de índice único y `downgrade` | OK |
| Regresión de rutas existentes | `test_registrar_el_router_del_salon_conserva_las_rutas_existentes`, suite completa de productos | OK |

## 4. Observaciones

- Se actualizó `backend/tests/modules/productos/test_migracion.py` para fijar `REVISION_PREVIA` en la prueba de downgrade, porque la cabeza de Alembic pasó a ser la migración de sectores. Es una consecuencia de la entidad nueva; productos no cambia de comportamiento.
- Se quitaron las funciones provisorias `listarMesas` y `listarMozos` de `frontend/src/modules/salon/api.ts` porque llamaban a rutas inexistentes. Los tipos `Mesa` y `Mozo` se conservan para HU-M3-05 y HU-M3-08.
- Diferencias con la maqueta: sin tabla de sectores, sin columna «Mesas» ni pestañas; el alta va en un diálogo. Corresponden a HU-M3-04/HU-M3-08.
- Sin dependencias nuevas. Archivo compartido tocado: `backend/app/main.py`.
