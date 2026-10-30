```yaml
schema: gentle-ai.verify-result/v1
verdict: pass
blockers: 0
critical_findings: 0
requirements: 2/2
scenarios: 15/15
acceptance_criteria: 7/7
test_command: "backend: ruff check . && ruff format --check . && lint-imports && pytest | frontend: npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build"
test_exit_code: 0
build_command: "frontend: npm run build"
build_exit_code: 0
```

# Informe de verificación: HU-M3-05 (Crear una mesa)

- **Veredicto: PASS** (0 CRITICAL, 0 WARNING)
- **Cambio:** `HU-M3-05` · **Rama:** `feature/HU-M3-05-crear-mesa` (3 commits de código: `688f34f`, `a70ccd2`, `e1adc83`) · **Modo:** Strict TDD · **Persistencia:** OpenSpec.
- **Alcance verificado:** issue #38, CA 1 a 7. Spec: 2 requisitos (1 nuevo de `salon-mesas` y 1 modificado de `salon-sectores`) y 15 escenarios.

## 1. Completitud de tareas

`tasks.md`: todas las tareas de las fases 1 a 3 marcadas `[x]`, 0 pendientes. Coinciden con `apply-progress.md`.

## 2. Ejecución de la CI (AGENTS.md §7)

| Lado | Comando | Resultado |
| --- | --- | --- |
| Backend | `ruff check . && ruff format --check . && lint-imports && pytest` | Exit 0: `All checks passed!`, `76 files already formatted`, 10 contratos cumplidos y 0 rotos, `461 passed`, cobertura 99,46 % (umbral 70 %) |
| Frontend | `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` | Exit 0: lint con 0 errores y 0 advertencias, Prettier correcto, `tsc --noEmit` correcto, cobertura global 76,48 % de líneas (umbral 60 %), build correcto |

`alembic heads`: una sola cabeza, `b2d4f6a8c0e1`.

## 3. Trazabilidad (criterio, escenario, prueba)

Backend: `backend/tests/modules/salon/{test_modelo,test_schemas,test_service,test_router,test_migracion}.py`. Frontend: `frontend/src/modules/salon/{api.test.ts,components/validarMesa.test.ts,components/useFormularioMesa.test.tsx,components/MesaFormDialog.test.tsx,pages/SalonPage.test.tsx}`.

| Criterio / escenario | Prueba | Resultado |
| --- | --- | --- |
| CA 1: alta con datos obligatorios | `test_crear_mesa_minima_queda_libre`, `test_crear_mesa_responde_201_con_la_forma_de_mesa_salida`, `api.test` «envía el alta por POST a /mesas», `useFormularioMesa.test` «envía los enteros, avisa y notifica el alta», `MesaFormDialog.test` «crea la mesa…», `SalonPage.test` «cierra el diálogo y avisa…» | OK |
| CA 2: dato obligatorio vacío | `test_mesa_crear_exige_los_tres_campos`, `test_crear_mesa_con_datos_invalidos_responde_422_sin_guardar[sin-campos]`, `validarMesa.test` «pide los tres campos», `MesaFormDialog.test` «con los campos vacíos no envía» | OK |
| CA 3: mesa repetida en el sector | `test_crear_mesa_rechaza_numero_repetido_en_el_sector`, `test_crear_mesa_repetida_en_el_sector_responde_409_con_detalle`, `test_unicidad_del_numero_por_sector`, `validarMesa.test` «ubica el 409 de número repetido bajo Número», `MesaFormDialog.test` «409 de número repetido bajo Número» | OK |
| CA 3: el mismo número en otro sector | `test_crear_mesa_permite_el_mismo_numero_en_otro_sector`, `test_crear_el_mismo_numero_en_otro_sector_responde_201`, `test_mismo_numero_en_otro_sector_es_valido` | OK |
| CA 4: cancelar | `MesaFormDialog.test` «al cancelar cierra sin enviar», `SalonPage.test` «al cancelar el alta de mesa…» | OK |
| CA 5: número con formato incorrecto | Parametrizados de `test_mesa_crear_rechaza_numero_y_capacidad_invalidos` y `test_crear_mesa_con_datos_invalidos_responde_422_sin_guardar` (0, negativo, texto, decimal, booleano), `validarMesa.test` (letras, decimales, coma, 0, negativo, exponencial) | OK |
| CA 6: capacidad inválida | Los mismos parametrizados en los casos de `capacidad`; `useFormularioMesa.test` «capacidad decimal»; `MesaFormDialog.test` «capacidad inválida» | OK |
| CA 7: estado `LIBRE` | `test_mesa_nueva_queda_libre_por_defecto`, `test_crear_mesa_minima_queda_libre`, `test_mesa_crear_rechaza_campos_desconocidos`, `MesaFormDialog.test` «muestra el aviso de estado», aserción exacta del cuerpo sin `estado` | OK |
| Sector inexistente | `test_crear_mesa_con_sector_inexistente_es_no_encontrado`, `test_crear_mesa_con_sector_inexistente_responde_404` | OK |
| Sector deshabilitado | `test_crear_mesa_rechaza_un_sector_deshabilitado`, `test_crear_mesa_en_un_sector_deshabilitado_responde_409`, `validarMesa.test` «ubica el 409 del sector bajo Sector» | OK |
| `GET /sectores` con y sin filtro | `test_listar_sectores_filtra_por_estado_y_cuenta_solo_los_filtrados`, `test_listar_sectores_sin_filtro_devuelve_todos`, pruebas de servicio equivalentes | OK |
| Paginación y estado inválido | `test_listar_sectores_con_parametros_invalidos_responde_422[limit-101|offset-negativo|estado-invalido]` | OK |
| Sin sectores habilitados | `MesaFormDialog.test` «sin sectores habilitados…», `SalonPage.test` ««Crear sector» cierra mesa y abre el de sector» | OK |
| Migración | `test_upgrade_crea_mesas_con_restricciones`, `test_upgrade_impone_la_unicidad_del_numero_por_sector`, `test_downgrade_de_un_paso_elimina_mesas_y_conserva_sectores` | OK |
| Regresión de sectores y M1 | Suite completa de backend y frontend; el alta de sectores y las rutas de productos siguen verdes | OK |

## 4. Observaciones

- `EstadoMesa` quedó en `backend/app/shared/models/enums.py` y se re-exporta desde `backend/app/shared/models/__init__.py`. Es archivo compartido: avisar a M4 y M5 en el PR.
- La prueba de downgrade de sectores se ajustó a `-2` porque la cabeza de Alembic avanzó; se agregó una prueba específica de `downgrade -1` para mesas.
- `GET /sectores` es la lectura de apoyo mínima de HU-M3-04; la pantalla de listado no se implementa en esta HU.
- Diferencias con la maqueta: sin tabla, filtros ni pestañas (HU-M3-08); el alta va en un diálogo y conviven «Nuevo sector» y «Nueva mesa».
- Punto de control de revisión: backend ≈ 857 líneas y frontend ≈ 850, apenas por encima de 800 por lado. La HU va en un solo PR.
