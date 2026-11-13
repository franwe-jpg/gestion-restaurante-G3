# Comanda Waiter Assignment Specification

## Purpose

Define waiter selection for new Comandas and explicit assignment or correction of historical Comandas while retaining nullable historical data.

## Requirements

### Requirement: Require an enabled waiter when opening a Comanda

The system MUST require a manually selected existing, enabled Mozo when creating a new Comanda. M4 MUST validate the Mozo through a public operation of M3's service boundary and MUST NOT depend on M3 repositories, models, or schemas. A nonexistent Mozo MUST produce HTTP 404; an existing disabled Mozo MUST produce HTTP 409. Errors MUST use the standard `{"detalle":"message"}` response shape. A Comanda created from a reservation MUST NOT require or receive a Mozo until its Comanda is opened.

#### Scenario: Create with an enabled Mozo

- GIVEN a selected Mozo exists and is enabled
- WHEN a user submits a valid new Comanda
- THEN the Comanda is created with that Mozo assigned

#### Scenario: Reject a nonexistent Mozo

- GIVEN the submitted Mozo ID does not identify a Mozo
- WHEN a user submits a valid new Comanda
- THEN creation is rejected with HTTP 404 and the standard error body, and no Comanda is created

#### Scenario: Reject a disabled Mozo

- GIVEN the submitted Mozo exists but is disabled
- WHEN a user submits a valid new Comanda
- THEN creation is rejected with HTTP 409 and the standard error body, and no Comanda is created

#### Scenario: Reservation does not assign a waiter before opening

- GIVEN a reservation has not yet been used to open a Comanda
- WHEN the reservation is created or managed
- THEN no Mozo assignment is required or made by this capability

### Requirement: Preserve historical nullable waiter assignments

Comanda response schemas and list results MUST expose assigned-Mozo information while remaining readable when the persisted `mozo_id` is NULL. The system MUST NOT automatically backfill historical NULL assignments. This change MUST reuse the existing nullable column and MUST NOT introduce a duplicate migration or a non-null constraint.

#### Scenario: Read a historical Comanda without a waiter

- GIVEN a persisted historical Comanda has `mozo_id` NULL
- WHEN it is returned by a Comanda read or list operation
- THEN the response remains valid and represents its waiter as absent

#### Scenario: Do not backfill historical Comandas

- GIVEN historical Comandas have NULL waiter assignments
- WHEN this capability is deployed or new Comandas are created
- THEN the historical assignments remain NULL unless explicitly changed through the controlled operation

### Requirement: Explicitly assign or correct a historical Comanda waiter

The system MUST provide a controlled operation to assign or correct the Mozo on an existing Comanda. The operation MUST validate the selected Mozo using M3's public service boundary, MUST reject a nonexistent Mozo with HTTP 404 and a disabled Mozo with HTTP 409, and MUST log each successful assignment or correction at the application level. Actor attribution is not required. The operation MUST affect only the explicitly identified Comanda and MUST NOT perform bulk assignment.

#### Scenario: Assign a waiter to an unassigned historical Comanda

- GIVEN an existing Comanda has no assigned Mozo and the selected Mozo exists and is enabled
- WHEN an explicit controlled application operation assigns that Mozo to that Comanda
- THEN the Comanda is updated and an application log entry records the change

#### Scenario: Correct an existing waiter assignment

- GIVEN an existing Comanda has a waiter and the replacement Mozo exists and is enabled
- WHEN an application operation explicitly replaces the assignment
- THEN the Comanda reflects the replacement and an application log entry records the change

#### Scenario: Reject an invalid historical assignment

- GIVEN the selected Mozo is nonexistent or disabled
- WHEN an application operation attempts to assign or correct a Comanda
- THEN the operation returns respectively HTTP 404 or HTTP 409, leaves the Comanda unchanged, and does not log a successful change

#### Scenario: Do not automatically correct historical assignments

- GIVEN historical Comandas have NULL or existing Mozo assignments
- WHEN no explicit per-Comanda assignment or correction is requested
- THEN their assignments remain unchanged and no assignment-change log is emitted
