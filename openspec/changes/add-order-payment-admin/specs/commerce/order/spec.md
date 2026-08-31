## ADDED Requirements

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
