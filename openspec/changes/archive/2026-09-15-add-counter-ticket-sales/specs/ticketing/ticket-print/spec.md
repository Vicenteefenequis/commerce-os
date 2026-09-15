## Purpose

Gives a staff member a printable, thermal-receipt-sized rendering of an issued Ticket, so a physical proof of entry can be handed to a visitor who did not receive it digitally.

## ADDED Requirements

### Requirement: Ticket print view is isolated by tenant
The Ticket print view SHALL be reachable only by an authenticated admin session authorized within the Ticket's owning Organization, following the same tenant isolation as reading the Ticket itself.

#### Scenario: Print view denies a Ticket from another Organization
- **WHEN** an authenticated session from Organization A requests the print view for a Ticket belonging to Organization B
- **THEN** the system denies the operation

#### Scenario: Print view renders for an authorized session
- **WHEN** an authenticated session authorized within a Ticket's owning Organization requests its print view
- **THEN** the system renders that Ticket's print layout

### Requirement: Print layout fits a thermal receipt printer
The Ticket print view SHALL render at a width compatible with common thermal receipt printers (58mm or 80mm), showing the Ticket's QR code, its code as readable text, the offer (Product) name, the lote (variant) name, and the Order's buyer name (or the counter-sale placeholder name).

#### Scenario: Print layout shows required content at receipt width
- **WHEN** a Ticket's print view is rendered
- **THEN** it displays the QR code, the code as text, the offer name, the lote name, and the buyer name, laid out at a width suitable for a 58mm or 80mm thermal printer

### Requirement: Print view is available for any issued Ticket
The Ticket print view SHALL be available for a Ticket regardless of whether its Order originated from storefront checkout or a counter sale.

#### Scenario: Storefront-originated ticket can be printed from admin
- **WHEN** an authorized admin session requests the print view for a Ticket whose Order's channel is `storefront`
- **THEN** the system renders that Ticket's print layout the same as it would for a `counter` channel Order
