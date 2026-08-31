# payments/payment Specification

## Purpose

Turns an Order sitting in `awaiting_payment` into a paid Order by processing a real payment through an external Payment Provider, with an auditable financial trail independent of the Order's own history.

## Requirements

### Requirement: Payment Provider abstraction
The system SHALL process payments through a Payment Provider abstraction, so that no other part of the system depends on a specific provider's API shape.

#### Scenario: Payment creation does not leak provider details
- **WHEN** a Payment is created for an Order
- **THEN** the system's own Payment record and status are independent of the specific provider's internal object model

### Requirement: Supported payment methods
The system SHALL support both Pix and card as payment methods for an Order.

#### Scenario: Customer pays with Pix
- **WHEN** a customer selects Pix as the payment method for an Order
- **THEN** the system creates a Payment that can be completed via Pix through the Payment Provider

#### Scenario: Customer pays with card
- **WHEN** a customer selects card as the payment method for an Order
- **THEN** the system creates a Payment that can be completed via card through the Payment Provider

### Requirement: Payment lifecycle states
A Payment SHALL have an explicit status of one of: `pending`, `succeeded`, `failed`, `partially_refunded`, `refunded`.

#### Scenario: New payment starts as pending
- **WHEN** a Payment is created for an Order awaiting payment
- **THEN** its status is `pending`

### Requirement: Payment is tied to exactly one Order
A Payment SHALL belong to exactly one Order, and an Order SHALL have at most one Payment that is not `failed`.

#### Scenario: Second payment attempt after a failure
- **WHEN** a Payment for an Order fails and the customer retries payment
- **THEN** the system creates a new Payment for the same Order rather than reusing the failed one

#### Scenario: Duplicate active payment is rejected
- **WHEN** a new Payment is requested for an Order that already has a `pending` or `succeeded` Payment
- **THEN** the system rejects the new Payment request

### Requirement: Webhook processing is idempotent
The system SHALL process each Payment Provider webhook event exactly once, regardless of how many times that event is delivered.

#### Scenario: Duplicate webhook delivery is not double-processed
- **WHEN** the Payment Provider delivers the same event more than once (e.g. a retried webhook)
- **THEN** the system applies its effect only once and does not create duplicate state changes

#### Scenario: Webhook signature is verified
- **WHEN** an incoming webhook request does not carry a valid signature for the configured Payment Provider
- **THEN** the system rejects the request and applies no state change

### Requirement: Payment confirmation never relies solely on browser redirect
The system SHALL NOT mark a Payment as `succeeded` based only on the customer's browser being redirected back from the Payment Provider.

#### Scenario: Redirect without server-side confirmation does not confirm payment
- **WHEN** a customer's browser is redirected back to the payment page after a payment attempt
- **THEN** the system's Payment status reflects only what the Payment Provider has confirmed server-to-server, not the redirect itself

### Requirement: Payment status can be checked without an authenticated session
The system SHALL let the payment page check a Payment's current status by its id, without requiring an authenticated session, so a guest customer can confirm their own payment outcome. This exposes only the Payment's status, not its Order's other contents.

#### Scenario: Guest customer checks their payment's status
- **WHEN** a request supplies a valid Payment id (and the tenant it belongs to)
- **THEN** the system returns that Payment's current status without requiring authentication

### Requirement: Successful payment transitions the Order to paid
The system SHALL transition an Order from `awaiting_payment` to `paid` when its Payment is confirmed `succeeded` by the Payment Provider, and SHALL confirm every `pending` Reservation backing the Order's lines so their held capacity becomes committed.

#### Scenario: Confirmed payment pays the order
- **WHEN** a Payment Provider webhook confirms a Payment as succeeded
- **THEN** the system transitions the Payment to `succeeded` and the associated Order to `paid`

#### Scenario: Payment confirms held reservations
- **WHEN** an Order with a line backed by a `pending` Reservation transitions to `paid`
- **THEN** the Reservation transitions to `confirmed` and its held capacity remains committed

### Requirement: Refund support
The system SHALL support refunding a `succeeded` Payment, fully or partially, and SHALL reflect the result on the associated Order's status.

#### Scenario: Full refund
- **WHEN** a `succeeded` Payment is refunded in full
- **THEN** the Payment's status becomes `refunded` and the Order transitions to `refunded`

#### Scenario: Partial refund
- **WHEN** a `succeeded` Payment is refunded for less than its full amount
- **THEN** the Payment's status becomes `partially_refunded` and the Order transitions to `partially_refunded`

### Requirement: Financial changes are audited
Every Payment status change, and every refund, SHALL be recorded with the resulting status, the amount involved, a timestamp, and what caused it (webhook event or admin action).

#### Scenario: Payment success is audited
- **WHEN** a Payment transitions to `succeeded`
- **THEN** the system records an entry identifying the Payment, its Order, the resulting status, and the triggering event

#### Scenario: Refund is audited
- **WHEN** a refund is issued against a Payment
- **THEN** the system records an entry identifying the Payment, the refunded amount, the resulting status, and the actor or webhook event that caused it

### Requirement: Payment belongs to a single tenant
A Payment SHALL be readable and writable only by identities authorized within its owning Organization.

#### Scenario: Payment is isolated by tenant
- **WHEN** a user from Organization A attempts to read or modify a Payment belonging to Organization B
- **THEN** the system denies the operation
