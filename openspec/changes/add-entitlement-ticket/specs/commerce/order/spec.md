## ADDED Requirements

### Requirement: Order snapshots its purchasing Customer
An Order SHALL retain the identity of the Customer who purchased it, captured at creation, independent of later changes to that Customer's record.

#### Scenario: Order retains its Customer
- **WHEN** an Order is created from a checkout
- **THEN** the Order references the Customer resolved for that checkout

#### Scenario: Later Customer changes do not affect existing Orders
- **WHEN** a Customer's name is changed after an Order referencing them was created
- **THEN** the existing Order still references the same Customer identity
