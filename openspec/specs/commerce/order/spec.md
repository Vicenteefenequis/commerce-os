# commerce/order Specification

## Purpose

Represents a customer's purchase as an explicit, auditable record: what was bought, at what price, and in what state, from creation through fulfillment or cancellation.

## Requirements

### Requirement: Order lifecycle states
An Order SHALL have an explicit status of one of: `draft`, `awaiting_payment`, `paid`, `fulfilled`, `partially_refunded`, `refunded`, `cancelled`, `expired`.

#### Scenario: New order starts as draft
- **WHEN** an Order is created from a checkout
- **THEN** its status is `draft`

### Requirement: Order status transitions are recorded
Every Order status change SHALL be recorded with the resulting status, a timestamp, and the actor or system process that caused it.

#### Scenario: Transition to paid is recorded
- **WHEN** an Order transitions from `awaiting_payment` to `paid`
- **THEN** the system records an entry identifying the Order, the previous status, the new status, and what caused the transition

### Requirement: Order snapshots commercial terms at creation
An Order line SHALL retain a snapshot of the Product variant's name and price at the moment the Order was created, independent of later changes to the Product.

#### Scenario: Price change after order creation does not affect the order
- **WHEN** a Product variant's price is changed after an Order containing that variant was created
- **THEN** the existing Order's line still reflects the price captured at creation time

### Requirement: Order lines may hold capacity
An Order line for a variant that references a Resource SHALL be backed by a Reservation that holds the corresponding capacity for the order's lifetime up to confirmation or release.

#### Scenario: Creating an order line holds capacity
- **WHEN** an Order is created with a line for a variant that has a `resourceId`
- **THEN** the system creates a `pending` Reservation for that Resource and period with the line's quantity as the held amount

#### Scenario: Order line for a variant without a resource holds no capacity
- **WHEN** an Order is created with a line for a variant that has no `resourceId`
- **THEN** the system creates no Reservation for that line

### Requirement: Order cancellation releases held capacity
Cancelling or expiring an Order SHALL release the capacity held by any Reservations backing its lines.

#### Scenario: Cancelling a draft order releases capacity
- **WHEN** a `draft` or `awaiting_payment` Order is cancelled
- **THEN** every Reservation backing its lines is released and the Order's status becomes `cancelled`

### Requirement: Order belongs to a single tenant
An Order SHALL be readable and writable only by identities authorized within its owning Organization.

#### Scenario: Order is isolated by tenant
- **WHEN** a user from Organization A attempts to read or modify an Order belonging to Organization B
- **THEN** the system denies the operation

### Requirement: Orders can be listed by tenant
The system SHALL allow an authorized actor to retrieve all Orders belonging to their Organization.

#### Scenario: Listing tenant orders
- **WHEN** an authorized actor requests the list of Orders for their Organization
- **THEN** the system returns every Order belonging to that Organization, independent of status

#### Scenario: Listing is isolated by tenant
- **WHEN** a user from Organization A requests the list of Orders
- **THEN** the system returns only Orders belonging to Organization A, never Orders belonging to another Organization

### Requirement: Order detail exposes its active payment
Retrieving a single Order's detail SHALL include its active Payment (the most recent Payment that is not `failed`), when one exists, so an authorized actor does not need a separate lookup by Payment id to see payment status.

#### Scenario: Order detail includes payment
- **WHEN** an authorized actor retrieves an Order that has a `pending`, `succeeded`, `partially_refunded`, or `refunded` Payment
- **THEN** the Order detail includes that Payment's id, status, method, amount, and refunded amount

#### Scenario: Order detail with no active payment
- **WHEN** an authorized actor retrieves an Order that has no Payment, or only `failed` Payments
- **THEN** the Order detail is returned with no active payment
