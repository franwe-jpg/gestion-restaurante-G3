# Tasks: S3-M4 — Reconcile Client and First-Reservation Integration

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 0 implementation lines; one planning artifact only |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | No apply planned; verification-only task |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: No — no apply is planned; this task records requested verification only.
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Verify existing HU-M4-01 client/first-reservation scenarios without modifying code or tests | N/A — verification-only; single PR is not applicable | `pytest tests/modules/reservas/test_router.py -k 'puente_real_alta_con_cliente_nuevo_lo_registra_en_m4 or puente_real_reserva_fallida_no_deja_cliente_huerfano or puente_real_carrera_por_el_indice_unico_no_deja_cliente_nuevo or puente_real_nombre_invalido_devuelve_422_sin_cliente or puente_real_dato_obligatorio_faltante_no_crea_cliente_ni_reserva'` (run from `backend/`; command recorded, not executed in this phase) | N/A — existing pytest tests are the focused runtime harness | Revert `openspec/changes/S3-M4/tasks.md`; no implementation state is changed |

## Phase 1: Focused Verification

- [ ] 1.1 Run the focused existing test cases in `backend/tests/modules/reservas/test_router.py` (read-only): successful new-client registration and association, reservation failure without an orphan client, unique-index race rollback, invalid client name, and missing required client fields. Use the command in Suggested Work Units from `backend/`; do not run complete suites or change code/tests. If checks pass, make no code changes and create no implementation tasks; report the focused results. If a concrete failure appears, record it as a finding for follow-up rather than adding an implementation task here.
