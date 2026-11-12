# Delta for Comanda Creation

## ADDED Requirements

### Requirement: Carry Mozo assignment in Comanda creation and responses

The Comanda creation contract MUST include the manually selected `mozo_id` for new Comandas, and Comanda response schemas and list summaries MUST expose the assigned Mozo information. This extension MUST remain compatible with existing historical records whose `mozo_id` is NULL: responses MUST represent that absence without invalidating the record. The S2-01 DTO/API contract is provisional and currently does not include Mozo fields; this requirement specifies a compatible extension and does not imply that coordination with its owner has occurred. Existing nullable persistence MUST be reused without a new migration.

#### Scenario: Create contract carries the selected Mozo

- GIVEN the user selected an existing enabled Mozo
- WHEN a valid Comanda creation request is submitted
- THEN its input contract carries that Mozo's identifier and the resulting Comanda response exposes the assigned Mozo information

#### Scenario: List exposes the assigned Mozo

- GIVEN a Comanda has an assigned Mozo
- WHEN the Comanda appears in a list response
- THEN the response exposes the assigned Mozo information

#### Scenario: Historical response with no Mozo

- GIVEN a historical Comanda has `mozo_id` NULL
- WHEN its response or list summary is serialized
- THEN it remains readable and expresses the Mozo as absent
