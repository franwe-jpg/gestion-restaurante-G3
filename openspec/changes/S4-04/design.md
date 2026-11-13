# Design: Assign a Waiter to a Comanda

## Technical Approach

Extend M4's existing Comanda flow without changing the already-nullable `comandas.mozo_id` column. A new Comanda receives a manually selected Mozo ID, validated through a narrow M3 service operation before M4 persists it. Comanda output and list summaries expose nullable Mozo information, preserving historical records. A separate explicit per-Comanda operation supports historical assignment/correction and application logging. The frontend adds enabled Mozos to S4-03's existing catalog-loading path and selector pattern.

The four S4-04 spec files intentionally have distinct responsibilities: `comanda-asignacion-mozo` is the full capability contract (creation validation, historical nullable reads, explicit corrections); `comanda-alta` owns only the S2-01-compatible create/response/list DTO extension; `comanda-gestion` owns only the controlled operation contract; `comanda-seleccion-catalogo` owns only the enabled-Mozo selector. Implementation and archive work must not copy these requirements between domains.

Although S2-01 is provisional, its shared contract at `backend/app/shared/contratos/comanda.py` exists and this change extends it in place with `mozo_id`; compatibility for historical nullable values is required. This does not claim the broader M4–M5–M6 contract is frozen. The implementation also updates the productive M4 layers: `atencion.service.crear_comanda` owns the transaction and currently lacks the Mozo input. `crear_comanda_para_reserva` delegates through `_registrar_comanda`; reservation creation remains outside Mozo assignment and only Comanda opening requires a Mozo.

## Architecture Decisions

### Decision: Validate Mozo through an M3 public-service operation

**Choice**: Add/reuse a narrow operation in `backend/app/modules/salon/service.py` that looks up a Mozo and checks `Estado.HABILITADO`. It returns a public `MozoSalida` projection (including identity and display name) or raises existing shared `NoEncontradoError` / `ReglaDeNegocioError`. M4 invokes it through an M4-owned port/adapter in `backend/app/modules/atencion/adaptadores.py`; M4 imports no M3 repository, model, or schema.
**Alternatives considered**: M4 direct database lookup or importing M3 repository/model/schema; using the existing paginated `listar_mozos` as a validation lookup.
**Rationale**: The direct lookup crosses the mandated module boundary. Listing to validate one identifier is pagination-dependent and can silently miss valid Mozos. M3's current `obtener_mesa` / `ocupar_mesa` and M4's `MesasDeSalon` adapter demonstrate public-service delegation. Translate not-found to HTTP 404 and disabled to HTTP 409 through the existing shared exception handlers.

### Decision: Keep persistence nullable and make output null-safe

**Choice**: Set `Comanda.mozo_id` when creating new Comandas, while retaining `int | None` in persistence and output. Extend the existing S2-01 contract with the selected `mozo_id` on create and nullable `mozo_id` on output. Use M3's public paginated Mozo list to resolve names for the selector and list display; do not add M3 ORM access to M4.
**Alternatives considered**: Non-null constraint, automatic historical backfill, or returning only a numeric ID.
**Rationale**: `Comanda.mozo_id` is already nullable and there is no M3 FK by design. Existing null values must remain readable. Reusing the public paginated M3 list avoids per-Comanda service lookups and keeps module boundaries intact. The list UI can map IDs to names from the paginated catalog.

### Decision: Use a dedicated explicit correction operation and log

**Choice**: Add an M4 service operation and one explicit HTTP route for assigning/replacing the Mozo on one identified Comanda. The service loads that Comanda, validates the proposed Mozo via the M3 port, updates `mozo_id`, emits an application logger record describing Comanda ID and old/new Mozo IDs, then commits in the existing service transaction pattern. It never bulk-updates or requires authentication. Actor attribution is omitted.
**Alternatives considered**: Reuse generic Comanda modification, silently update on read/deploy, or create an audit table/event subsystem.
**Rationale**: A distinct operation makes historical changes intentional and independently testable. The user explicitly requires application logging but defers actor identity; a new persistent audit schema or auth flow is not authorized and would duplicate scope. Match existing service transaction ownership and standard API errors.

### Decision: Extend, do not fork, S4-03's catalog hook

**Choice**: Extend S4-03's M4 API/catalog types and hook for Mozo display names. Use one searchable “Mozo” field in `ComandaForm`, composed from the shared `SearchInput` and option `Button`s. A data hook sends the current name query to the public M3 API and keeps the selected ID separate from typed text.
**Alternatives considered**: Keep separate search and select fields, create another stand-alone selector component, or import M3 frontend internals.
**Rationale**: The final user decision requires one integrated combobox. Composing shared UI parts preserves S4-03 styling without a parallel component. The public API lookup serves both the selector and the Comandas list while respecting server filtering and pagination.

### Decision: Respect pagination and do not assume 100 Mozos is exhaustive

**Choice**: Query M3's public paginated list with `estado=HABILITADO&q=<name-or-surname>` and retrieve every matching page. For list display, retrieve all paginated Mozos so names remain available when a previously assigned Mozo is disabled. Do not silently treat `limit=100` as the complete catalog.
**Alternatives considered**: Fetch the first 100 rows once and filter/search only in memory.
**Rationale**: M3 returns `Pagina[MozoSalida]` with the shared maximum of 100 and exposes an optional name query. Searching and aggregating backend pages prevents missing options beyond the first page. The selector requests enabled Mozos only; the list's separate all-status catalog resolves disabled historical assignments.

### Decision: Keep reservation and S2-01 fake behavior unchanged

**Choice**: Reservation setup/management does not acquire a Mozo; `crear_comanda_para_reserva` follows the same new-Comanda requirement only when it is called to open the Comanda. Extend the shared S2-01 contract in place; keep reservation creation and unrelated fake behavior unchanged.
**Alternatives considered**: Assign the waiter on reservation creation or alter the test-only fake to stand in for M4 production behavior.
**Rationale**: User decisions explicitly defer assignment until Comanda opening. S2-01 disclaims production API status and remains provisional; adapting it here could imply shared acceptance and expand scope.

## Data Flow

```text
ComandaForm -> one “Mozo” combobox -> useMozosHabilitados(q)
  -> atencion/api.ts -> paginated GET /mozos?estado=HABILITADO&q=...
  -> user selects an option -> mozo_id -> POST /comandas
       -> atencion.router -> atencion.service
       -> M4 Mozo port/adapter -> salon.service: validate existing + enabled
       -> atencion.repository: persist mozo_id with Comanda/details
        -> response DTO with nullable mozo_id

ComandasPanel -> paginated GET /mozos (all states) -> map mozo_id to display name

Explicit historical correction:
Client -> PUT /comandas/{id}/mozo {mozo_id}
  -> router -> M4 service: load exactly one Comanda
  -> M3 public service validation -> repository update -> application log -> commit
```

New-Comanda missing Mozo produces 404; disabled Mozo produces 409 and no Comanda insert. A failed validation or write rolls back M4's transaction. Historical correction validates before mutation; invalid target does not change the Comanda or emit a successful-change log. Existing null rows remain null unless the explicit operation targets that specific Comanda.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/app/modules/atencion/service.py` | Modify | Add Mozo port dependency to Comanda creation flow; validate before insertion; add explicit one-Comanda assignment/correction service operation; return Mozo-aware Comanda outputs and log successful corrections. Keep reservation creation free of pre-opening assignment. |
| `backend/app/modules/atencion/adaptadores.py` | Modify | Implement the M4-owned Mozo port by calling only the public `salon.service` operation. |
| `backend/app/modules/atencion/repository.py` | Modify | Persist `mozo_id` on creation; eagerly/load assigned Mozo information only through an approved public projection, or return IDs for service enrichment; add targeted lookup/update helpers for correction. No M3 ORM access. |
| `backend/app/modules/atencion/schemas.py` | Modify | Define request body for explicit Mozo assignment and any M4-owned transport wrappers; continue using shared Comanda DTOs for Comanda create/output. |
| `backend/app/modules/atencion/router.py` | Modify | Inject Mozo port into create; add one controlled route (proposed `PUT /comandas/{comanda_id}/mozo`) and standard response type. |
| `backend/app/modules/salon/service.py` | Modify | Expose public Mozo validation/projection and, if approved with M3, searchable enabled-Mozo pagination. |
| `backend/app/modules/salon/repository.py` | Modify only if required | Add bounded parameterized Mozo name search / targeted validation query; keep all queries in M3 repository. |
| `backend/app/modules/salon/router.py`, `schemas.py` | Modify only if required | Expose the enabled/searchable Mozo catalog through M3's existing public API and `Pagina` envelope; avoid exporting internal models. |
| `backend/app/shared/contratos/comanda.py` | Modify | Extend create/output/list shared DTOs with required input `mozo_id` and nullable historical output Mozo information, coordinated against provisional S2-01 contract. |
| `frontend/src/modules/atencion/api.ts` | Modify | Add typed enabled-Mozo catalog retrieval and explicit assignment request. |
| `frontend/src/modules/atencion/types.ts` | Modify | Extend Comanda create/summary/output and catalog types with Mozo ID and nullable display information. |
| `frontend/src/modules/atencion/components/catalogoComanda.ts` | Modify | Load enabled Mozos alongside existing catalog data and account for pagination/search. |
| `frontend/src/modules/atencion/components/useCatalogoComanda.ts` | Modify | Expose Mozo options/loading/error state and opt-in catalog loading without affecting unrelated consumers. |
| `frontend/src/modules/atencion/components/ComandaForm.tsx` | Modify | Add required searchable Mozo selector; block submit while loading, on catalog error, or when no selectable Mozo exists. |
| `frontend/src/modules/atencion/components/ComandasTabla.tsx` and relevant detail/panel components | Modify | Display assigned Mozo name or an absent marker for historical NULL. Add correction UI only if explicitly included in the reviewed product surface; API operation remains required by spec. |
| `backend/tests/modules/atencion/` | Modify | Strict-TDD tests for creation success/failure, nullable historical output, targeted correction, logging, and rollback/no mutation. |
| `backend/tests/modules/salon/` | Modify | Public Mozo service validation/search contract tests. |
| `frontend/src/modules/atencion/components/*.test.ts(x)`, `api.test.ts` | Modify | Selector search/pagination, loading/error/empty states, ID submission, nullable display and correction request tests. |
| `backend/alembic/versions/` | No change | Existing `c3e5a7b9d1f2_agrega_mozo_id_a_comandas.py` already adds the nullable column; no duplicate migration or backfill. |

`backend/app/shared/contratos/comanda.py` exists and is the shared S2-01 contract; extend it in place with `mozo_id` on create and nullable `mozo_id` on historical output. Do not recreate the contract or change the existing nullable migration. Reuse M3's public paginated list, adding only the minimal optional name-search filter to its public service/API if client-side search across available pages cannot provide complete results. No authentication, actor attribution, unrelated module work, S2-01 fake modification, or schema migration is included.

## Interfaces / Contracts

The following signatures are design-level shapes; confirm shared DTO names and M3 search interface before tasks. They are not a claim that S2-01's provisional test DTO is already the productive contract.

```python
class MozosPort(Protocol):
    def validar_habilitado(self, db: Session, mozo_id: int) -> MozoResumen: ...


class ComandaCrear(ExistingComandaCreate):
    mozo_id: StrictInt = Field(gt=0)


class ComandaMozoAsignar(BaseModel):
    model_config = ConfigDict(extra="forbid")
    mozo_id: StrictInt = Field(gt=0)


@router.put("/comandas/{comanda_id}/mozo")
def asignar_mozo(
    comanda_id: Annotated[int, Path(gt=0)], datos: ComandaMozoAsignar, db: Sesion,
    mozos: Annotated[MozosPort, Depends(obtener_mozos_port)],
) -> ComandaSalida: ...
```

The shared Comanda DTO carries flat `mozo_id`; create requires a positive selected ID and outputs allow `null` for historical Comandas. The M3 public paginated list supplies Mozo display names to the selector and Comanda list. Preserve M4's existing standard error mapping: missing Mozo `404`, disabled Mozo `409`, and `{"detalle":"message"}`. The correction route is `PUT /comandas/{comanda_id}/mozo`, distinct from `PUT /comandas/{id}` which modifies details.

For selector search, M3's current `GET /mozos` accepts `estado`, `limit`, and `offset` and returns `Pagina[MozoSalida]`; there is no name-query parameter. A complete searchable catalog needs either a coordinated `q` filter and pagination in that public endpoint or a selector that searches remotely through an approved equivalent. Do not implement a first-page-only search as if exhaustive.

## Testing Strategy

Strict TDD applies: add each RED test first, run the focused test to demonstrate the missing behavior (not an import/setup failure), then implement minimally and verify GREEN before refactoring.

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit — M3 service | Existing enabled Mozo accepted; missing and disabled distinguishable via `NoEncontradoError` / `ReglaDeNegocioError`; search returns only enabled rows and honors query/pagination if added. | `backend/tests/modules/salon/test_service.py` with existing DB fixtures and repository-backed tests. |
| Unit — M4 service | New assignment persisted; missing=404/disabled=409 through adapter/service; no insert on invalid Mozo; historical null remains null; targeted assignment and replacement update only the chosen Comanda; missing Comanda uses existing 404; invalid attempts do not mutate/log; successful correction logs once; transaction failure rolls back. | `backend/tests/modules/atencion/test_service.py`, injected fake `MozosPort` and `caplog`/logger capture, following current transaction tests. |
| API integration | Create request requires Mozo; response/list/detail serialize assigned data and `null`; correction route contract, status/body mapping, and no changes on invalid IDs. | `backend/tests/modules/atencion/test_router.py` with the project's TestClient/database setup and dependency overrides. |
| Frontend unit | API URL/query pagination and correction payload; catalog aggregation retains S4-03 behavior and incorporates Mozo; absent names remain safe. | `api.test.ts`, `catalogoComanda.test.ts`, `useCatalogoComanda.test.tsx`. |
| Frontend component | Searchable enabled-only selection, no ID typing, selected ID submitted; loading, empty and catalog error block submit; assigned/absent Mozo displayed; explicit correction calls API if UI is in reviewed scope. | `ComandaForm.test.tsx`, `ComandasTabla.test.tsx`, correction component test if included. |
| E2E | Not currently available in project. | N/A. |

Cover pagination beyond the first page and more than 100 enabled Mozos if the catalog API remains paged. Also verify reservation creation path does not require a Mozo until it opens a Comanda. No migration test is required; regression-test a row with `mozo_id=NULL` using current schema.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary is introduced by this design. The application HTTP route is a normal product API endpoint, not the process/routing automation boundary covered by the threat matrix.

## Migration / Rollout

No migration required. `backend/app/modules/atencion/models.py` already declares `mozo_id` nullable, and `backend/alembic/versions/c3e5a7b9d1f2_agrega_mozo_id_a_comandas.py` is already present. Do not duplicate it, add a non-null constraint, or backfill historical rows. New Comanda requests become required to provide a valid enabled Mozo; existing historical rows remain readable. Coordinate client/DTO rollout so callers are updated with the required create field; no feature flag or auth change is in scope.

## Open Questions

- [ ] Extend the existing S2-01 contract in place and coordinate the DTO field with its owner before integration; historical output remains nullable.
- [ ] Inspect M3's current pagination limits and response envelope. Reuse the public list; add only the minimal optional name filter through M3's public service/API if paginated client-side search cannot cover the complete enabled catalog.
- [ ] No dedicated historical-edit screen is in scope; expose the controlled M4 service/API operation only. “Controlled” means explicit per-Comanda operation, not authentication or authorization.
- [ ] Keep the correction route `PUT /comandas/{comanda_id}/mozo` and shared DTO's flat `mozo_id`; verify compatibility with existing consumers during implementation.
