# Verify report: HU-M4-01-02-03

Mode: openspec. Strict TDD: active. Scope: whole change, focus on tasks 1.5, 2.6, 2.7 and 4.1 (executed by HU-M5-01-02-03). Backend only; frontend suites not run in this pass.

## Verdict: PASS WITH WARNINGS (0 CRITICAL, 3 WARNING, 2 SUGGESTION)

## Runtime evidence (from backend/)
| Command | Result |
| --- | --- |
| `ruff check .` | All checks passed |
| `ruff format --check .` | 120 files already formatted |
| `lint-imports` | 10 kept, 0 broken |
| `pytest` (full) | 1625 passed, 1 warning (Starlette/httpx deprecation); coverage 99.26 % (threshold 70 %) |
| Focused: `tests/modules/atencion` + `reservas/test_router.py -k "cliente or puente_real"` | 97 passed |

## Tasks
Checked: 1.1-1.5, 2.1-2.7, 3.1-3.3, 4.1, 4.2 (17/20).
Open: 4.3 (documental), 4.4 (quality), 4.5 (preparation).

## Spec compliance matrix
| Scenario | Covering tests | Status |
| --- | --- | --- |
| #48 CA1 client + first reservation | `test_puente_real_alta_con_cliente_nuevo_lo_registra_en_m4` (reservas/test_router.py); service: `test_registrar_cliente_para_reserva_devuelve_id_sin_commit`, `..._rollback_posterior_no_deja_cliente`, `..._permite_nombres_repetidos`; repo `test_crear_cliente_asigna_id_con_flush_y_rollback_lo_descarta` | PASS |
| #48 CA2 missing required field | `test_registrar_cliente_para_reserva_campo_vacio_nombra_el_campo`; `test_puente_real_dato_obligatorio_faltante_no_crea_cliente_ni_reserva` | PASS |
| #48 CA3 invalid name | `test_registrar_cliente_para_reserva_nombre_invalido_nombra_el_campo`; `test_puente_real_nombre_invalido_devuelve_422_sin_cliente` | PASS |
| #48 reservation failure, no orphan client | `test_puente_real_reserva_fallida_no_deja_cliente_huerfano`; `test_puente_real_carrera_por_el_indice_unico_no_deja_cliente_nuevo` | PASS |
| Delta: `existe_cliente` | `test_existe_cliente_distingue_existente_de_inexistente`; `test_puente_real_cliente_existente_que_m4_no_conoce_devuelve_404` | PASS |
| #49 CA1-CA4, inexistente | test_router/test_service/test_schemas atencion (`test_modificar_cliente_devuelve_200_y_consulta_posterior`, `..._invalido_devuelve_422_y_conserva_ambos_datos`, `test_modificar_cliente_inexistente_no_crea_otro`, schemas) | PASS (backend; frontend per apply-progress, not re-run) |
| #50 CA1-CA5 | `test_listar_clientes_*` (repository/router) | PASS (backend; frontend per apply-progress, not re-run) |

## Design coherence (Delta: interfaz acordada con M5)
`registrar_cliente_para_reserva(db, nombre, telefono) -> int` and `existe_cliente(db, id) -> bool` exist in `atencion/service.py`; `crear_cliente` uses add + flush with no commit; no new HTTP route, no model or migration change. Matches design. M5 consumes them through its puente (real-puente tests above). lint-imports confirms no forbidden cross-module imports.

## Issues
CRITICAL: none.

WARNING
1. Task 4.4 unchecked. Backend half is now proven (table above); the frontend half (lint, format, typecheck, coverage, build) was not run here. Check the box only after the frontend checks run, or note they belong to the M5 verifier because M4 did not touch the frontend in this delta.
2. Task 4.3 unchecked (documentary differences in the two .drawio files and S1-07 are noted in the spec/design, but follow-up coordination is not recorded). Does not block archive if the follow-up is recorded.
3. Task 4.5 unchecked (dependencies #61/M3 and branch). The branch is correct; mark it done once the dependency status is confirmed. Does not block archive.

SUGGESTION
1. Evidence for 4.1 lives in the M5 change's tests (uncommitted at the time of verification); archive after both changes are committed in the same PR so the evidence is traceable.
2. Issue #48 closes with the PR; the person decides (AGENTS.md section 8).

## Notes
Frontend scenario evidence for #49/#50 relies on apply-progress (19 passed recorded); not re-executed by instruction.
