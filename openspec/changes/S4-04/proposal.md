# Proposal: Assign a Waiter to a Comanda

- **Issue:** #225 · **Branch:** `feature/S4-04-mozo-comanda`
- **Modules:** M4 `atencion/`; M3 `salon/` public-service boundary only. Frontend work extends the shared catalog work from S4-03 (#224, PR #232, reported merged by the user).

## Intent

Opening a Comanda currently does not associate it with the Mozo responsible for serving the table. Requiring a manual selection when opening the Comanda makes that responsibility visible while avoiding assigning a waiter to a reservation before guests arrive. The existing nullable `Comanda.mozo_id` supports the association; this change must not add a duplicate migration or erase historical null values.

## Scope

### In Scope
- Add a searchable Mozo selector to Comanda create and applicable listing/detail views, showing enabled Mozos only.
- Require a selected, existing, enabled Mozo when creating a new Comanda; validate through an operation exposed by M3's public service boundary.
- Return `404` for a nonexistent Mozo and `409` for an existing disabled Mozo.
- Expose the assigned Mozo in Comanda response schemas and list presentation.
- Keep existing Comandas with `mozo_id = NULL` readable and compatible.
- Provide a controlled operation to assign or correct the Mozo on historical Comandas, with application logging of each change; do not require actor attribution in this change.
- Preserve historical `NULL` assignments unless a person explicitly uses the controlled assignment/correction operation; never backfill them automatically.
- Coordinate the S2-01 shared DTO/API contract with its owner and reconcile the extension point from S4-03; retain strict TDD for apply.

### Out of Scope
- Assigning a Mozo to a reservation before guests arrive or opening a Comanda.
- Identifying or attributing the actor who performs an assignment/correction; authentication and actor identity are deferred.
- Authentication, a new migration for `mozo_id`, unrelated M3/M4 changes, and changes to S4-02 promotion behavior.

## Capabilities

### New Capabilities
- `comanda-asignacion-mozo`: select and validate an enabled Mozo when opening a Comanda; provide controlled assignment/correction and application logging for historical Comandas while preserving unmodified historical Comandas without an assignment.

### Modified Capabilities
- `comanda-seleccion-catalogo`: extend the S4-03 shared Comanda catalog selector with a searchable enabled-Mozo selector. Reuse its existing capability/spec rather than duplicating catalog behavior.
- `comanda-alta`: amend the S2-01 Comanda create/response contract to carry the required Mozo ID on new Comandas and return assigned-Mozo information without making historical nullable values invalid. Coordinate this contract change with its owner; do not duplicate an existing schema or migration.
- `comanda-gestion`: add a controlled operation to assign or correct the Mozo on an existing Comanda and log each change at the application level, without requiring actor attribution.

## Approach

Extend the S4-03 catalog-loading/selector pattern with enabled Mozos. M4 calls only M3's public service for an existence-and-enabled check, translating missing and disabled cases to the agreed `404` and `409`; it must not import M3 repository, model, or schema internals. New Comandas require an existing enabled Mozo. Include the Mozo association in Comanda input/output schemas and list presentation, respecting nullable persisted historical rows. Provide a controlled application operation to assign or correct a historical Comanda's Mozo and log the change, but defer actor attribution. Preserve existing `NULL` rows unless explicitly changed through that operation; never run an automatic backfill. Keep the existing `mozo_id` column and migration unchanged. Strict TDD applies during implementation. No reservation flow assigns a Mozo before Comanda opening.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/app/modules/atencion/{models,schemas,service,repository,router}.py` | Modified | Reuse existing nullable `mozo_id`; validate new assignments via M3 public service and expose the association in response/list schemas. Exact layer ownership is for design/spec confirmation. |
| `backend/app/modules/atencion/{service,repository,router}.py` | Modified | Add controlled historical assignment/correction and application logging; preserve nulls by default and do not record actor identity in this change. |
| `backend/app/modules/salon/service.py` | Modified / coordinate | Expose or reuse a public-service operation that validates Mozo existence and enabled status without leaking M3 internals. |
| `frontend/src/modules/atencion/{api.ts,types.ts,components/,pages/}` | Modified | Add searchable selector using enabled Mozos and present the assigned Mozo in Comanda views. |
| `openspec/changes/S4-03/` and S2-01 contract artifacts | Coordinate | Reconcile selector extension and shared DTO changes; do not duplicate S4-03 catalog requirements or S2-01 schemas. |
| `backend/tests/modules/{atencion,salon}/` and frontend Comanda tests | Modified | Cover new assignment, historical assignment/correction and logging, nonexistent/disabled waiter, and nullable historical output without automatic backfill. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| S2-01 DTO contract or S4-03 frontend work is incompatible with the change | Medium | Coordinate with the respective owners before implementation; preserve existing field names and extend the established selector/catalog rather than forking it. |
| Cross-module M3 validation violates import boundaries | Medium | Expose one narrow operation through M3's public service and test the M4-to-M3 service contract; import no M3 internals. |
| Existing nullable rows fail serialization or presentation | Medium | Keep output compatibility for `NULL`, add regression coverage, and avoid a non-null schema constraint or data backfill. |
| Historical corrections are not attributable to an authenticated actor | Medium | Keep actor attribution explicitly deferred; log the change in the application and avoid representing the log as actor-audited. |
| Controlled historical changes are mistaken for an instruction to backfill all null rows | Medium | Require an explicit operation per Comanda and verify no automatic bulk assignment occurs. |
| Recreating the existing nullable column migration causes migration conflicts | Low | Confirm and reuse `mozo_id` and its migration; add no duplicate schema change. |

## Rollback Plan

Revert the change's application and frontend commits. Do not drop or reverse the pre-existing `mozo_id` column/migration: it predates this change and contains historical-compatible nullable data. If the API contract has already been consumed, coordinate rollback with its consumers before reverting response/input changes.

## Dependencies

- Existing nullable `Comanda.mozo_id` and migration `c3e5a7b9d1f2_agrega_mozo_id_a_comandas.py` (already present; no duplicate migration).
- M3 public service must provide an existence-and-enabled validation operation.
- S2-01 shared Comanda DTO/API contract coordination with its owner.
- S4-03 enabled catalog and selector extension point (user reports PR #232 merged); verify compatibility locally before implementation.
- S4-02 (#223) is not a functional dependency; keep promotion behavior unchanged.
- No remote GitHub inspection was performed; issue/PR facts above are from the user-provided context.

## Success Criteria

- [ ] New Comanda creation requires an enabled, existing Mozo selected through the searchable frontend selector.
- [ ] Nonexistent Mozos produce `404`; disabled Mozos produce `409`, with the project's standard error body.
- [ ] Comanda schemas and list presentation expose the assigned Mozo.
- [ ] Existing Comandas with `mozo_id = NULL` remain readable and are not assigned automatically.
- [ ] A controlled operation can assign or correct a historical Comanda's Mozo and application-log the change; actor attribution is not required.
- [ ] Historical null assignments are preserved unless explicitly changed through the controlled operation; no automatic backfill occurs.
- [ ] No duplicate migration is added, and M4 communicates with M3 through its public service only.
- [ ] Reservation flows remain independent of Mozo assignment until Comanda opening.
- [ ] Strict TDD tests cover the acceptance cases; relevant CI checks pass.
