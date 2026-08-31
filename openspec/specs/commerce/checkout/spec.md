# commerce/checkout Specification

## Purpose

Turns a customer's cart into an Order without requiring an account, on a mobile-first flow the server controls end to end — pricing, capacity, and duplicate protection are never left to the client.

## Requirements

### Requirement: Checkout does not require account creation
The system SHALL allow a customer to complete checkout without creating an account.

#### Scenario: Guest completes checkout
- **WHEN** a customer without an account submits a valid cart for checkout
- **THEN** the system creates an Order without requiring account registration

### Requirement: Server recalculates price
The system SHALL recalculate every price and total from current Product/variant data at checkout time and SHALL NOT trust any price submitted by the client.

#### Scenario: Client-submitted price is ignored
- **WHEN** a checkout request includes a price for a line that differs from the variant's current price
- **THEN** the system uses its own recalculated price and ignores the submitted value

### Requirement: Checkout prevents accidental duplicate orders
The system SHALL prevent a single checkout submission from being accidentally processed more than once into separate Orders.

#### Scenario: Duplicate submission is not double-processed
- **WHEN** the same checkout submission is received more than once within a short window (e.g. a retried request)
- **THEN** the system creates only one Order for that submission

### Requirement: Checkout fails cleanly when capacity is unavailable
The system SHALL reject a checkout when any line's variant references a Resource that lacks sufficient available capacity, without creating a partial Order.

#### Scenario: Checkout rejected for insufficient capacity
- **WHEN** a checkout is submitted with a line whose quantity exceeds available capacity for its Resource and period
- **THEN** the system rejects the entire checkout, creates no Order, and holds no Reservation for any line
