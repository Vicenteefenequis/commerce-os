## ADDED Requirements

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
