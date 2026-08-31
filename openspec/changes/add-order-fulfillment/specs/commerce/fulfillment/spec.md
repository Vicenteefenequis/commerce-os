## Purpose

Marks a `paid` Order as `fulfilled` once the customer has redeemed what they bought, permanently consuming the capacity held by that Order's Reservations.

## ADDED Requirements

### Requirement: Order fulfillment
The system SHALL allow an authorized actor to fulfill a `paid` Order, transitioning it to `fulfilled`.

#### Scenario: Fulfilling a paid order
- **WHEN** an authorized actor fulfills an Order that is `paid`
- **THEN** the system transitions the Order to `fulfilled`

#### Scenario: An order not in paid cannot be fulfilled
- **WHEN** fulfillment is attempted on an Order that is not `paid`
- **THEN** the system rejects the request and leaves the Order's status unchanged

### Requirement: Fulfillment consumes held capacity
Fulfilling an Order SHALL consume every `confirmed` Reservation backing its lines, permanently retaining their held capacity as used.

#### Scenario: Fulfillment consumes a confirmed reservation
- **WHEN** a `paid` Order with a line backed by a `confirmed` Reservation is fulfilled
- **THEN** the Reservation transitions to `consumed` and its held capacity continues to be excluded from available capacity

#### Scenario: Order with no capacity-backed lines can be fulfilled directly
- **WHEN** a `paid` Order has no lines backed by a Reservation
- **THEN** the system transitions the Order to `fulfilled` without attempting to consume any Reservation

### Requirement: Fulfillment is recorded
Fulfilling an Order SHALL be recorded in the Order's status history and the audit log, identifying the actor who performed it.

#### Scenario: Fulfillment is audited
- **WHEN** an authorized actor fulfills an Order
- **THEN** the system records an entry identifying the Order, its previous status, `fulfilled`, and the acting identity

### Requirement: Fulfillment belongs to a single tenant
An Order SHALL be fulfillable only by identities authorized within its owning Organization.

#### Scenario: Fulfillment is isolated by tenant
- **WHEN** a user from Organization A attempts to fulfill an Order belonging to Organization B
- **THEN** the system denies the operation
