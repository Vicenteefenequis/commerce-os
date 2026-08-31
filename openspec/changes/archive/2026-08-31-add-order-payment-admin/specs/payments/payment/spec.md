## ADDED Requirements

### Requirement: Authorized actor can retrieve a Payment's full detail via its Order
An authorized actor within a Payment's owning Organization SHALL be able to retrieve that Payment's full detail (status, method, amount, refunded amount) as part of retrieving its Order, distinct from the existing unauthenticated status-only lookup by Payment id.

#### Scenario: Authorized actor sees full payment detail through the order
- **WHEN** an authorized actor within the Organization retrieves an Order that has an active Payment
- **THEN** the Payment's status, method, amount, and refunded amount are included, not only its status
