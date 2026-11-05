# Exploration: S3-M4 — HU-M4-01 Client and first-reservation integration

## Current State

Issue #201 asks to integrate PR #196 and coordinate the M5 contract for registering a Client with its first Reservation. The supplied evidence says #196 is merged to `develop` and describes HU-M4-01 as partial pending that coordination; its PR, review, and issue-comment endpoints were empty. This is historical tracking evidence, not proof that the current implementation is absent.

The existing M4 spec (`openspec/changes/HU-M4-01-02-03/specs/atencion-clientes/spec.md`, especially lines 20–22, 26–55, and 134) assigns the HTTP creation flow to M5, exposes `registrar_cliente_para_reserva(db, nombre, telefono) -> int` and `existe_cliente(db, cliente_id) -> bool`, and leaves transaction ownership to M5. It expressly disallows a standalone `POST /clientes` and requires the Client and first Reservation to commit or roll back together. The M5 spec (`openspec/changes/HU-M5-01-02-03/specs/reservas-gestion/spec.md`, lines 7, 37–39, 73–92, and 864 onward) defines `ReservaCrear` with exactly one of `cliente_id` or `cliente_nuevo`, the bridge calls to M4 service only, and atomic transaction ownership by the reservation service.

Current implementation evidence shows this contract is present:

- `backend/app/modules/atencion/schemas.py`: `ClienteNuevo` requires `nombre` and `telefono`, rejects empty values and invalid names/phone format; no uniqueness is imposed.
- `backend/app/modules/atencion/repository.py`: `crear_cliente` adds and flushes a Client but does not commit.
- `backend/app/modules/atencion/service.py`: `registrar_cliente_para_reserva` validates through `ClienteNuevo` and returns the flushed ID without commit/rollback; `existe_cliente` checks M4 persistence.
- `backend/app/modules/reservas/puente.py`: `registrar_cliente` and `existe_cliente` delegate through M4's service, without importing M4 internals.
- `backend/app/modules/reservas/schemas.py`: M5's `ClienteNuevo` handles shape only; `ReservaCrear` accepts existing or new Client, with the service enforcing exactly one.
- `backend/app/modules/reservas/service.py`: `crear_reserva` validates first, creates a new Client as its last pre-save step, then commits Reservation and Client together; the commit path rolls back on `IntegrityError`.
- `backend/tests/modules/reservas/test_router.py`: real-bridge tests at lines 853–968 cover successful registration and association, omitted required fields, invalid name, failed reservation without orphan Client, unique-index race without orphan Client, and nonexistent existing Client. The test fixture runs through real M3/M4 services and HTTP routing.
- The M5 frontend supports both paths: `frontend/src/modules/reservas/components/useFormularioReserva.ts` maps selection to `cliente_id` or `cliente_nuevo`; `frontend/src/modules/reservas/api.ts` includes client search via M4's `GET /clientes`; the API and form tests cover both request variants.

`HU-M4-01-02-03/apply-progress.md` section “4.1 Costura M4-M5 con reserva real” records these integration tests as passing in a full pytest run (1625 tests). This exploration did not rerun tests, as authorized. Historical progress entries before that section record earlier pending status and must not be mistaken for current state.

## Affected Areas

- `openspec/changes/HU-M4-01-02-03/specs/atencion-clientes/spec.md` — existing M4-side contract and HU-M4-01 acceptance requirements; reuse, do not duplicate.
- `openspec/changes/HU-M5-01-02-03/specs/reservas-gestion/spec.md` — existing M5 request/bridge/transaction contract; reuse, do not duplicate.
- `backend/app/modules/atencion/{schemas.py,repository.py,service.py}` — current M4 validation and service port implementation.
- `backend/app/modules/reservas/{schemas.py,puente.py,service.py}` — current M5 request contract, bridge, and atomic transaction.
- `backend/tests/modules/reservas/test_router.py` — current real integration evidence for HU-M4-01.
- `frontend/src/modules/reservas/{api.ts,components/useFormularioReserva.ts}` — current request selection and client search integration.

## Approaches

1. **Minimal closure/reconciliation (recommended)** — Treat the behavior as already implemented; add no new behavior or duplicate spec. If #201 still needs an SDD change for traceability, limit it to reconciling HU-M4-01/#201 and PR #196 status against the existing specs and integration evidence, then have the responsible people decide whether to close the issue/change.
   - Pros: avoids duplicating requirements or reopening a completed cross-module contract; matches the inspected code, tests, and existing specs.
   - Cons: repository evidence alone cannot establish whether the issue/PR tracking state has been formally reconciled or whether all reviewers accepted the integration.
   - Effort: Low.

2. **Implement additional integration behavior** — No concrete missing behavior was found to justify this.
   - Pros: would only be useful if a specific acceptance criterion is shown to fail in current code.
   - Cons: invents scope in the absence of a demonstrated gap and risks changing the already-resolved M4/M5 boundary.
   - Effort: Unknown; not recommended without new evidence.

## Recommendation

No implementation delta remains apparent for HU-M4-01's M4-to-M5 new-Client/first-Reservation integration: the agreed service interface, validation, bridge delegation, atomic transaction, UI request shape, and real integration tests are all present. Recommend a minimal closure/reconciliation scope only, with no new requirements or code changes. Coordinate with Federico (M5 owner) to confirm that the merged PR #196 and the real-bridge tests satisfy the previously pending agreement, and reconcile issue #201/#48 status through the authorized project workflow. Do not edit GitHub issues or PRs as part of this phase. No scope concerning Comandas HU-M4-06/07 is included.

## Risks

- The supplied PR #196 evidence contains no review or issue comments, so formal acceptance/closure cannot be inferred from those records.
- The recorded full pytest result is historical apply-progress evidence; this exploration did not rerun tests or verify the current runtime test environment.
- M4 and M5 specs have intentionally separate ownership: any newly identified defect must be assigned to the owning module and coordinated with Federico rather than expanding this exploration's scope.

## Ready for Proposal

Yes, only for a minimal documentation/tracking reconciliation proposal if the orchestrator requires a proposal artifact. If the intended proposal is an implementation change, stop and request concrete failing evidence or a missing acceptance criterion; none was found in this exploration.
