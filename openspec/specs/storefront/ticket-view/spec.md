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
