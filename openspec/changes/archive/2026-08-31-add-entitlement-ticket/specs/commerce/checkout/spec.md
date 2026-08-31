## ADDED Requirements

### Requirement: Checkout captures the buyer's identity
The system SHALL require a buyer email and name on every checkout submission and SHALL resolve or create the corresponding Customer as part of creating the Order.

#### Scenario: Checkout without buyer identity is rejected
- **WHEN** a checkout is submitted without a buyer email or name
- **THEN** the system rejects the request and creates no Order

#### Scenario: Checkout with buyer identity creates the Order with its Customer
- **WHEN** a checkout is submitted with a valid buyer email and name
- **THEN** the system creates the Order referencing the resolved Customer
