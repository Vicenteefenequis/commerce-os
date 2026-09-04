## MODIFIED Requirements

### Requirement: Tickets for a paid Order can be listed account-less
The system SHALL allow an unauthenticated request carrying an Order's id and its owning tenant id to list every Ticket issued for that Order's Entitlements, without requiring the requester to be an authenticated identity, and SHALL include, per Ticket, the owning Organization's name and slug, the offer (Product) name, the lote (variant) name, the Order's buyer name, and the Entitlement's Reservation validity window when one exists.

#### Scenario: Listing tickets for a paid order
- **WHEN** an unauthenticated request supplies a paid Order's id and its owning tenant id
- **THEN** the system returns every Ticket issued for that Order's Entitlements

#### Scenario: Listing is scoped by tenant and order id together
- **WHEN** a request supplies an Order id together with a tenant id that is not the Order's owning tenant
- **THEN** the system returns no Tickets, as if the Order did not exist

#### Scenario: Order not yet paid has no Tickets to list
- **WHEN** an unauthenticated request lists Tickets for an Order that has not transitioned to `paid`
- **THEN** the system returns an empty list, since no Ticket has been issued yet

#### Scenario: Listed ticket includes display context
- **WHEN** an unauthenticated request lists Tickets for a paid Order
- **THEN** each returned Ticket includes the owning Organization's name and slug, the offer (Product) name, the lote (variant) name, and the Order's buyer name

#### Scenario: Listed ticket includes a validity window when its Entitlement is Reservation-backed
- **WHEN** a listed Ticket's Entitlement's Order line references a Reservation
- **THEN** the returned Ticket includes that Reservation's validity window (start and end)

#### Scenario: Listed ticket omits a validity window when not Reservation-backed
- **WHEN** a listed Ticket's Entitlement's Order line has no Reservation
- **THEN** the returned Ticket omits the validity window rather than showing a placeholder
