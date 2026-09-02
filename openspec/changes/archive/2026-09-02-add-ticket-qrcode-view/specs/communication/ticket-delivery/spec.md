## ADDED Requirements

### Requirement: Ticket email includes each Ticket's QR image
The ticket delivery email SHALL include, for each Ticket being delivered, a QR image of that Ticket's code alongside the code itself, rather than the code as plain text alone.

#### Scenario: Delivered email carries a QR image per ticket
- **WHEN** a Ticket delivery email is sent for an Order with one or more issued Tickets
- **THEN** the email includes one QR image per Ticket, each decoding to that Ticket's own code

#### Scenario: QR generation failure does not block delivery of the code
- **WHEN** rendering a Ticket's QR image fails for one Ticket in an Order with multiple Tickets
- **THEN** the email is still sent with that Ticket's code as text and the QR images that did succeed, and the delivery outcome is not recorded as failed solely because of that rendering failure
