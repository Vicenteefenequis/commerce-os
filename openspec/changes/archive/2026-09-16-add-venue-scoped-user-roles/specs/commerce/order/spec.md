## ADDED Requirements

### Requirement: Gerente order retrieval omits monetary fields
When the requesting identity's role is Gerente, retrieving an Order — whether through the list or the detail view — SHALL omit monetary fields (order line unit prices, order/line totals, and Payment amounts), returning status and all other non-monetary fields (customer, channel, timestamps, resource/product identifiers) unchanged.

#### Scenario: Gerente lists orders without monetary fields
- **WHEN** an identity holding the Gerente role requests the list of Orders for their Organization
- **THEN** the returned Orders include status, customer, and channel, but omit line prices and totals

#### Scenario: Gerente retrieves order detail without monetary fields
- **WHEN** an identity holding the Gerente role retrieves a single Order's detail
- **THEN** the returned detail omits line prices, order totals, and the active Payment's amount and refunded amount

#### Scenario: Admin retrieval is unaffected
- **WHEN** an identity holding the Admin role retrieves an Order, by list or detail
- **THEN** the returned Order includes its monetary fields as already specified

### Requirement: Gerente order access is scoped to their assigned Venue
An identity holding only the Gerente role SHALL be denied access to an Order belonging to a Venue outside their assigned Venue(s), even when that Order belongs to their own Organization.

#### Scenario: Gerente lists orders scoped to their Venue
- **WHEN** an identity holding the Gerente role scoped to Venue A requests the list of Orders for their Organization
- **THEN** the system returns only Orders belonging to Venue A

#### Scenario: Gerente is denied detail for an order outside their Venue
- **WHEN** an identity holding the Gerente role scoped to Venue A requests the detail of an Order belonging to Venue B
- **THEN** the system denies the operation
