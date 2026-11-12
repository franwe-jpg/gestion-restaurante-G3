# Delta for Comanda Management

## ADDED Requirements

### Requirement: Explicitly assign or correct the Mozo of an existing Comanda

The system MUST expose a controlled operation to assign or correct the Mozo on one explicitly identified existing Comanda. The operation MUST accept a Mozo identifier, validate existence and enabled status through M3's public service boundary, return HTTP 404 for a nonexistent Mozo and HTTP 409 for an existing disabled Mozo, and use the standard `{"detalle":"message"}` error body. On success it MUST persist the assignment and write an application-level log entry for that change. Actor attribution is not required. No automatic or bulk assignment is permitted.

#### Scenario: Assign a Mozo to an unassigned Comanda

- GIVEN an existing Comanda has no Mozo and the selected Mozo exists and is enabled
- WHEN a user invokes the controlled assignment operation for that Comanda
- THEN the Comanda is assigned to that Mozo and the application records the change in its log

#### Scenario: Correct a Comanda's Mozo

- GIVEN an existing Comanda has a Mozo and the selected replacement Mozo exists and is enabled
- WHEN a user invokes the controlled correction operation for that Comanda
- THEN the Comanda has the replacement assignment and the application records the change in its log

#### Scenario: Reject a nonexistent or disabled Mozo

- GIVEN the selected Mozo does not exist or exists but is disabled
- WHEN a user invokes the controlled assignment or correction operation
- THEN the operation returns respectively HTTP 404 or HTTP 409 with the standard error body and leaves the Comanda unchanged

#### Scenario: Preserve assignments absent an explicit operation

- GIVEN one or more historical Comandas have NULL Mozo assignments
- WHEN no controlled assignment is requested for those Comandas
- THEN their assignments remain NULL and no bulk assignment or change log is produced
