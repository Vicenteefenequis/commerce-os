## MODIFIED Requirements

### Requirement: Orders can be listed by tenant
The system SHALL allow an authorized actor to retrieve all Orders belonging to their Organization, optionally filtered by order id, customer email or name, and status.

#### Scenario: Listing tenant orders
- **WHEN** an authorized actor requests the list of Orders for their Organization with no filters
- **THEN** the system returns every Order belonging to that Organization, independent of status

#### Scenario: Listing is isolated by tenant
- **WHEN** a user from Organization A requests the list of Orders
- **THEN** the system returns only Orders belonging to Organization A, never Orders belonging to another Organization

#### Scenario: Filtering by order id
- **WHEN** an authorized actor requests the list of Orders with an order id filter
- **THEN** the system returns only the Order matching that id, if it belongs to their Organization

#### Scenario: Filtering by customer email or name
- **WHEN** an authorized actor requests the list of Orders with a customer email or name filter
- **THEN** the system returns only Orders whose Customer's email or name matches the filter

#### Scenario: Filtering by status
- **WHEN** an authorized actor requests the list of Orders with a status filter
- **THEN** the system returns only Orders in that status

#### Scenario: Combining filters
- **WHEN** an authorized actor requests the list of Orders with more than one filter
- **THEN** the system returns only Orders matching all of the supplied filters
