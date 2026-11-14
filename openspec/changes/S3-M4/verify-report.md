# Verification Report: S3-M4 — Client and First-Reservation Integration

## Status

**Result: Verified with focused checks.** The confirmed HU-M4-01 agreement matches the S3-M4 delta, the existing M4/M5 contracts, and the inspected implementation. No source, test, proposal, spec, design, or task files were changed in verification; this report is the only artifact written.

## Contract comparison

- **Client fields within Reservation form:** The S3-M4 delta requires the new-Client fields to be inside Reservation creation, not a standalone registration. This aligns with M4's prohibition on standalone `POST /clientes` and M5's `ReservaCrear` contract. `ReservaFormDialog` renders `SelectorCliente` as part of its Reservation form; the selector supplies the new Client's name and phone. Focused frontend tests verify the new-Client selection, fields, and request shape.
- **Persistence only with a successful first Reservation:** M4's public service validates and flushes the Client without committing. The M5 bridge delegates through that service, and `crear_reserva` invokes it only after validating the other Reservation conditions. `_confirmar` adds the Reservation and commits once.
- **Failure rolls back both records:** The M5 transaction handler rolls back on `IntegrityError`. Existing real-bridge router cases cover failures before insertion (404/409/422), a unique-index race after the Client is flushed, invalid names, and missing required fields; assertions check that neither an orphan Client nor an extra Reservation remains.
- The existing M4 specification assigns transaction ownership to M5; the M5 specification defines the API shape, bridge delegation, validation ordering, and atomicity. The S3-M4 delta clarifies form placement and atomic outcome without conflicting with either contract.
- No Comandas HU-M4-06/07 requirements or implementation were inspected or included in scope.

## Implementation and test evidence

Static inspection confirmed the behavior in `backend/app/modules/atencion/service.py`, `backend/app/modules/reservas/puente.py`, `backend/app/modules/reservas/service.py`, `frontend/src/modules/reservas/components/ReservaFormDialog.tsx`, and `SelectorCliente.tsx`.

### Commands executed

From `backend/`:

```bash
PYTHONDONTWRITEBYTECODE=1 PYTEST_ADDOPTS='-p no:cacheprovider --no-cov' ./.venv/bin/pytest tests/modules/reservas/test_router.py -q -k 'puente_real_alta_con_cliente_nuevo_lo_registra_en_m4 or puente_real_reserva_fallida_no_deja_cliente_huerfano or puente_real_carrera_por_el_indice_unico_no_deja_cliente_nuevo or puente_real_nombre_invalido_devuelve_422_sin_cliente or puente_real_dato_obligatorio_faltante_no_crea_cliente_ni_reserva'
```

**Observed:** exit 0; **8 passed, 94 deselected**, 1 Starlette/httpx deprecation warning, in 55.68s. The eight cases include parametrized missing-field and reservation-failure variants. This is focused runtime evidence, not a full suite or coverage result.

From `frontend/`:

```bash
./node_modules/.bin/vitest run src/modules/reservas/components/ReservaFormDialog.test.tsx src/modules/reservas/components/SelectorCliente.test.tsx
```

**Observed:** exit 0; **2 test files passed, 79 tests passed**, in 20.03s. These component tests use mocked API responses; they establish UI behavior and request shape, not a browser-to-backend transaction.

## Strict TDD evidence

Strict TDD is enabled. There is no S3-M4 `apply-progress.md`, and this change is verification/reconciliation-only; therefore no S3-M4 RED/GREEN cycle is claimed. Historical apply-progress evidence in the referenced M4/M5 changes documents actual RED and GREEN cycles for the relevant implementation, including M5's S41 real-bridge scenarios and frontend integration. The current focused runs reconfirm GREEN for the selected cases, but cannot independently prove the historical RED sequence. No historical evidence is fabricated or rewritten.

The checked tests make behavioral assertions: persisted Client/Reservation association, error status and details, absence of orphan records, and frontend submission of exactly the chosen client variant. No tautological or empty-loop-only assertion was found in the focused test cases inspected.

### Test layer distribution

| Layer | Evidence | Result |
|---|---|---|
| Backend integration | FastAPI `TestClient`, real M3/M4 bridge, SQLite test DB | 8 passed |
| Frontend component integration | Testing Library/Vitest with API mocked | 79 passed |
| E2E | Not available/in scope | Not run |

Coverage, lint, type checking, build, full backend/frontend suites, and manual browser-to-server testing were not run, per the focused verification request. No failure from those unrun checks is implied.

## Task state and recommendation

- S3-M4 task 1.1 (focused verification): observed complete for this verification run; the task checkbox was intentionally left unchanged.
- No implementation gap was identified by the requested scenarios. No implementation task was added.
- **Next recommended phase: archive/reconcile**, subject to the responsible person's review. This verification does not establish formal acceptance or closure of GitHub issues or PRs.

## Risks and limitations

- Backend emitted one Starlette/httpx deprecation warning; it did not affect the test outcome.
- Test success is focused evidence only and does not replace full-suite/CI checks or prove manual browser-to-server behavior.
- Repository artifacts cannot establish formal reviewer acceptance or issue/PR closure.
