## ADDED Requirements

### Requirement: Checkout can be submitted for payment
The system SHALL let a customer move their `draft` Order to `awaiting_payment`, without requiring account creation, so it becomes payable.

#### Scenario: Guest submits a draft order for payment
- **WHEN** a customer without an account submits their `draft` Order for payment
- **THEN** the system transitions the Order to `awaiting_payment`

#### Scenario: An order not in draft cannot be submitted again
- **WHEN** a submit-for-payment request targets an Order that is not `draft`
- **THEN** the system rejects the request and leaves the Order's status unchanged
