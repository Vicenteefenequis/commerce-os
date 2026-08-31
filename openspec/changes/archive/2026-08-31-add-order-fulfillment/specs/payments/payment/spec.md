## MODIFIED Requirements

### Requirement: Successful payment transitions the Order to paid
The system SHALL transition an Order from `awaiting_payment` to `paid` when its Payment is confirmed `succeeded` by the Payment Provider, and SHALL confirm every `pending` Reservation backing the Order's lines so their held capacity becomes committed.

#### Scenario: Confirmed payment pays the order
- **WHEN** a Payment Provider webhook confirms a Payment as succeeded
- **THEN** the system transitions the Payment to `succeeded` and the associated Order to `paid`

#### Scenario: Payment confirms held reservations
- **WHEN** an Order with a line backed by a `pending` Reservation transitions to `paid`
- **THEN** the Reservation transitions to `confirmed` and its held capacity remains committed
