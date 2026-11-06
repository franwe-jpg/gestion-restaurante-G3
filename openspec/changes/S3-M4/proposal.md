# Proposal: S3-M4 — Reconcile Client and First-Reservation Integration

## Intent

Record the M4/M5 agreement, confirmed before Sprint 3, as the definitive HU-M4-01 contract: the Client form is part of the Reservation form, and a new Client is persisted only when its first Reservation succeeds; a failed operation rolls both records back. Compare this contract with existing specs, implementation, and focused tests. The expected result is a spec clarification only if the current evidence already satisfies it.

## Scope

### In Scope
- Clarify HU-M4-01 in the existing Cliente specification using the confirmed form-placement and atomic-persistence decision; reference rather than duplicate the existing M5 Reservation contract.
- Compare each relevant acceptance criterion with current M4/M5 code and focused real-bridge tests; record any concrete coverage gap without changing code or adding redundant tasks.
- Verify the integration with focused checks only; do not run complete suites.

### Out of Scope
- Any code or test changes unless verification identifies a concrete behavioral defect; none is currently indicated by exploration.
- Duplicating the existing M5 reservation/bridge requirements or creating redundant implementation tasks.
- Closing, editing, or otherwise changing issue #201, PR #196, or other GitHub records.
- Comandas HU-M4-06/07.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `atencion-clientes`: make the confirmed HU-M4-01 agreement explicit: the new-Client fields are presented within Reservation creation, and Client persistence is atomic with the first Reservation.

## Approach

Update only the HU-M4-01 requirement in the existing Cliente specification to record the user's definitive confirmation of the pre-Sprint-3 M4/M5 agreement. Reuse the existing M5 `reservas-gestion` contract for endpoint, bridge, and transaction ownership. Compare implementation and tests criterion by criterion; if they pass, make no source/test changes and create no implementation tasks. Do not infer formal review, acceptance, or tracking closure from repository evidence.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `openspec/changes/S3-M4/proposal.md` | New | Planning record reconciling historical tracking state with the existing contract and evidence. |
| `openspec/changes/HU-M4-01-02-03/specs/atencion-clientes/spec.md` | Reference | Existing M4 contract used as the source for the focused HU-M4-01 delta. |
| `openspec/changes/HU-M5-01-02-03/specs/reservas-gestion/spec.md` | Reference only | Existing M5 request, bridge, and transaction contract; no spec change proposed. |
| `openspec/changes/S3-M4/specs/atencion-clientes/spec.md` | New delta | Record the confirmed HU-M4-01 form-placement and atomic-persistence agreement without duplicating M5's contract. |
| Existing M4/M5 implementation and integration tests | Evidence only | Current behavior and coverage are documented in exploration; no implementation files expected to change. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Historical status may be mistaken for current acceptance or formal closure. | Medium | State explicitly that evidence does not establish GitHub closure or reviewer acceptance; make no GitHub edits. |
| The recorded test result is historical and was not rerun during exploration. | Medium | Describe it as existing evidence, not as a fresh verification result. |
| Focused tests may not cover every database failure path. | Medium | Report actual coverage precisely; do not expand the contract or alter code without a concrete failing case. |

## Rollback Plan

Revert the S3-M4 planning artifacts. No code, tests, or GitHub records are changed by the proposed work, so no implementation rollback is required.

## Dependencies

- Existing M4 and M5 specs and integration evidence described in `openspec/changes/S3-M4/exploration.md`.
- User-confirmed agreement with Federico completed before Sprint 3.

## Success Criteria

- [ ] The definitive form-placement and atomic-persistence agreement is explicit in the HU-M4-01 spec delta.
- [ ] Existing M4/M5 implementation and focused tests are compared against the agreement; only concrete gaps produce tasks.
- [ ] The proposal makes no claim that issue #201 or PR #196 has been closed or formally accepted.
- [ ] The acceptance-boundary confirmation is documented without expanding scope to Comandas HU-M4-06/07.
