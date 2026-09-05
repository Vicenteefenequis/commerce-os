# storefront/ticket-view Specification

## Purpose

Gives an account-less consumer, once their Order's payment succeeds, a screen to view each of their purchased Tickets as a scannable QR code, one at a time, without requiring a login or a separate retrieval link.

## Requirements

### Requirement: Ticket view is shown only after payment succeeds
The storefront payment screen SHALL show the Order's Tickets only once that Order's payment status is `succeeded`, and SHALL NOT show any Ticket while payment is pending, failed, or not yet started.

#### Scenario: Tickets appear after successful payment
- **WHEN** a consumer's payment for an Order resolves to `succeeded`
- **THEN** the payment screen replaces the payment form with the Order's Tickets

#### Scenario: No tickets shown before payment succeeds
- **WHEN** an Order's payment is pending or has failed
- **THEN** the payment screen does not attempt to display any Ticket

### Requirement: Each Ticket is shown one at a time with navigation
When an Order holds more than one Ticket, the storefront ticket view SHALL display exactly one Ticket's QR code at a time and SHALL let the consumer navigate to the previous or next Ticket.

#### Scenario: Single-ticket order shows no navigation
- **WHEN** an Order has exactly one Ticket
- **THEN** the ticket view displays that Ticket's QR code without previous/next controls

#### Scenario: Multi-ticket order navigates between tickets
- **WHEN** an Order has more than one Ticket
- **THEN** the ticket view displays one Ticket at a time and lets the consumer move to the next or previous Ticket in the Order

#### Scenario: Navigation does not wrap past the ends
- **WHEN** the consumer is viewing the first or last Ticket of the Order
- **THEN** the view offers no previous control before the first Ticket and no next control after the last Ticket

### Requirement: Ticket view requires no account or login
The storefront ticket view SHALL be reachable and usable by the purchasing consumer without creating an account or authenticating.

#### Scenario: Guest views tickets without logging in
- **WHEN** a consumer who completed checkout without an account reaches the ticket view
- **THEN** the screen displays their Order's Tickets without prompting for login or registration

### Requirement: Ticket view shows tenant identity and offer details
The storefront ticket view SHALL display, alongside each Ticket's QR code: the owning Organization's name and slug, the ticket's code as readable text, the offer (Product) name, the lote (variant) name, and the Order's buyer name as the ticket holder.

#### Scenario: Ticket view shows full display context
- **WHEN** the storefront ticket view displays a Ticket
- **THEN** it shows the Organization's name and slug, the Ticket's code as text, the offer name, the lote name, and the buyer name together with the QR code

### Requirement: Ticket view states its validity window when one exists
When a Ticket's Entitlement is Reservation-backed, the storefront ticket view SHALL display that Reservation's validity window. When it is not, the view SHALL NOT display a fabricated or implied validity window.

#### Scenario: Reservation-backed ticket shows its validity window
- **WHEN** the ticket view displays a Ticket whose Entitlement is Reservation-backed
- **THEN** it shows that Reservation's start and end as the ticket's validity window

#### Scenario: Non-Reservation-backed ticket shows no validity window
- **WHEN** the ticket view displays a Ticket whose Entitlement has no Reservation
- **THEN** it shows no validity window for that ticket

### Requirement: Ticket view states single-use consumption accurately
The storefront ticket view SHALL state that the ticket is consumed on first successful scan, matching `access/scan`'s actual behavior, and SHALL NOT claim a broader re-entry policy that the system does not enforce.

#### Scenario: Ticket view states first-scan consumption
- **WHEN** the ticket view displays any Ticket
- **THEN** it states that the ticket is consumed on its first successful scan
