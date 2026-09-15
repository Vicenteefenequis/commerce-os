## MODIFIED Requirements

### Requirement: Supported payment methods
The system SHALL support Pix, card, and cash as payment methods for an Order. Pix and card are processed through the Payment Provider abstraction; cash is recorded directly by an authorized admin action, without involving a Payment Provider.

#### Scenario: Customer pays with Pix
- **WHEN** a customer selects Pix as the payment method for an Order
- **THEN** the system creates a Payment that can be completed via Pix through the Payment Provider

#### Scenario: Customer pays with card
- **WHEN** a customer selects card as the payment method for an Order
- **THEN** the system creates a Payment that can be completed via card through the Payment Provider

#### Scenario: Counter sale pays with cash
- **WHEN** an authorized admin session completes a counter sale
- **THEN** the system creates a `cash` Payment for the Order without contacting a Payment Provider

### Requirement: Payment lifecycle states
A Payment SHALL have an explicit status of one of: `pending`, `succeeded`, `failed`, `partially_refunded`, `refunded`.

#### Scenario: New payment starts as pending
- **WHEN** a Payment for Pix or card is created for an Order awaiting payment
- **THEN** its status is `pending`

#### Scenario: New cash payment starts as succeeded
- **WHEN** a `cash` Payment is created for a counter sale
- **THEN** its status is `succeeded` at creation, without passing through `pending`

### Requirement: Successful payment transitions the Order to paid
The system SHALL transition an Order from `awaiting_payment` to `paid` when its Payment is confirmed `succeeded` — by the Payment Provider for Pix and card, or immediately for a `cash` Payment created by an authorized admin action — and SHALL confirm every `pending` Reservation backing the Order's lines so their held capacity becomes committed.

#### Scenario: Confirmed payment pays the order
- **WHEN** a Payment Provider webhook confirms a Payment as succeeded
- **THEN** the system transitions the Payment to `succeeded` and the associated Order to `paid`

#### Scenario: Cash payment pays the order immediately
- **WHEN** an authorized admin action creates a `cash` Payment as `succeeded` for a counter sale
- **THEN** the system transitions the associated Order directly to `paid`

#### Scenario: Payment confirms held reservations
- **WHEN** an Order with a line backed by a `pending` Reservation transitions to `paid`
- **THEN** the Reservation transitions to `confirmed` and its held capacity remains committed
