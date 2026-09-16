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

### Requirement: Order detail exposes its active payment
Retrieving a single Order's detail SHALL include its active Payment (the most recent Payment that is not `failed`), when one exists, so an authorized actor does not need a separate lookup by Payment id to see payment status.

#### Scenario: Order detail includes payment
- **WHEN** an authorized actor retrieves an Order that has a `pending`, `succeeded`, `partially_refunded`, or `refunded` Payment
- **THEN** the Order detail includes that Payment's id, status, method, amount, and refunded amount

#### Scenario: Order detail with no active payment
- **WHEN** an authorized actor retrieves an Order that has no Payment, or only `failed` Payments
- **THEN** the Order detail is returned with no active payment

### Requirement: Order snapshots its purchasing Customer
An Order SHALL retain the identity of the Customer who purchased it, captured at creation, independent of later changes to that Customer's record.

#### Scenario: Order retains its Customer
- **WHEN** an Order is created from a checkout
- **THEN** the Order references the Customer resolved for that checkout

#### Scenario: Later Customer changes do not affect existing Orders
- **WHEN** a Customer's name is changed after an Order referencing them was created
- **THEN** the existing Order still references the same Customer identity

### Requirement: Order records its sales channel
An Order SHALL record which channel created it: `storefront` (created through `commerce/checkout`) or `counter` (created through `admin/counter-sale`).

#### Scenario: Storefront checkout sets the storefront channel
- **WHEN** an Order is created through `commerce/checkout`
- **THEN** that Order's channel is `storefront`

#### Scenario: Counter sale sets the counter channel
- **WHEN** an Order is created through `admin/counter-sale`
- **THEN** that Order's channel is `counter`

### Requirement: Orders can be filtered by sales channel
The system SHALL allow an authorized actor to filter the list of an Organization's Orders by channel, alongside its existing filters (order id, customer email or name, status).

#### Scenario: Filtering by channel
- **WHEN** an authorized actor requests the list of Orders with a channel filter
- **THEN** the system returns only Orders matching that channel

#### Scenario: Combining a channel filter with other filters
- **WHEN** an authorized actor requests the list of Orders with a channel filter and one or more of the existing filters
- **THEN** the system returns only Orders matching all of the supplied filters

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
