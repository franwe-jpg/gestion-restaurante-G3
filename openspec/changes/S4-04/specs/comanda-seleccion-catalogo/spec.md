# Delta for Comanda Catalog Selection

## ADDED Requirements

### Requirement: Search and select enabled Mozos for Comanda creation

The Comanda creation form MUST extend the existing searchable catalog-selector pattern with one required field labeled “Mozo”, implemented as an integrated searchable combobox. Typing MUST filter Mozos by name or surname through the public paginated M3 API; the UI MUST retrieve all matching pages and offer enabled Mozos only. Selecting an option MUST store its `mozo_id`; typed text alone MUST NOT count as a selection or permit submission. The field MUST NOT require manual entry of an identifier. Existing S4-03 selectors and catalog behavior remain unchanged.

#### Scenario: Search enabled Mozos

- GIVEN the enabled-Mozo catalog is available
- WHEN a user opens the Comanda creation form and searches by a Mozo's name
- THEN matching enabled Mozos are offered for selection and disabled Mozos are not shown

#### Scenario: Keep search and selection in one required field

- GIVEN the Comanda creation form
- WHEN a user searches for a Mozo and selects a matching option
- THEN the single “Mozo” combobox displays the selected name and the request stores its `mozo_id`
- AND text that has not been selected MUST NOT enable submission

#### Scenario: Submit the selected Mozo

- GIVEN a user selected an enabled Mozo in the searchable selector
- WHEN the user submits a valid Comanda
- THEN the request carries that Mozo's identifier without requiring the user to enter an ID manually

#### Scenario: No enabled Mozos are available

- GIVEN the enabled-Mozo catalog is empty
- WHEN a user opens the Comanda creation form
- THEN the selector communicates that no enabled Mozos are available and submission is blocked

#### Scenario: Mozo catalog load fails

- GIVEN loading the enabled-Mozo catalog fails
- WHEN a user opens the Comanda creation form
- THEN the form presents the catalog error and does not submit a Comanda without a selected Mozo
