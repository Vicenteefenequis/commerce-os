## Purpose

Lets an account-less consumer register interest in a sold-out offer (Product) with just an email, and be notified, once, when capacity for it becomes available again — without reserving that capacity or guaranteeing a purchase.

## ADDED Requirements

### Requirement: Joining a waitlist requires only an email
The system SHALL allow an unauthenticated request to join a specific offer's (Product's) waitlist by supplying only an email address, with no account or other personal data required.

#### Scenario: Consumer joins with just an email
- **WHEN** an unauthenticated consumer submits an email to join a sold-out offer's waitlist
- **THEN** the system records a waitlist entry for that offer and email

#### Scenario: Waitlist join is rejected for an offer that is not sold out
- **WHEN** a waitlist join is submitted for an offer that currently has available capacity
- **THEN** the system rejects the join, since there is nothing to wait for

### Requirement: At most one active entry per offer and email
The system SHALL allow at most one un-notified waitlist entry per offer-and-email pair; a repeat join with the same email while an un-notified entry exists SHALL be treated as a no-op, not an error.

#### Scenario: Duplicate join is idempotent
- **WHEN** a consumer joins the same offer's waitlist twice with the same email before being notified
- **THEN** the system records only one entry and does not report an error on the second attempt

#### Scenario: Rejoining after being notified creates a new entry
- **WHEN** a consumer whose prior waitlist entry for an offer was already notified joins that offer's waitlist again
- **THEN** the system records a new, un-notified entry

### Requirement: Newly available capacity notifies waitlisted entries in join order
When a resource-backed offer's available capacity increases from zero to a positive number, the system SHALL notify that offer's un-notified waitlist entries in ascending join-time order, up to the number of newly available units, by email.

#### Scenario: Capacity release notifies the earliest joiners first
- **WHEN** an offer's available capacity rises from zero to three units and five entries are waitlisted
- **THEN** the system notifies the three entries with the earliest join time and leaves the remaining two un-notified

#### Scenario: Notification does not reserve capacity
- **WHEN** a waitlist entry is notified
- **THEN** the notified consumer's capacity is not held or reserved on their behalf; the offer remains available on a first-come-first-served basis to anyone

### Requirement: Notification uses the existing swappable delivery mechanism
Waitlist notification SHALL be sent through the same swappable email-provider abstraction `communication/ticket-delivery` uses, and a delivery failure or unconfigured provider SHALL NOT prevent the entry from being marked notified or affect any other system behavior.

#### Scenario: Delivery failure still marks the entry notified
- **WHEN** waitlist notification email delivery fails
- **THEN** the system still records the entry as notified and the failure does not affect capacity or any other Order

### Requirement: A notified entry is never re-notified
Once a waitlist entry has been notified, the system SHALL NOT notify it again, even if the offer's capacity later returns to zero and becomes available again.

#### Scenario: Entry is not notified twice across separate availability windows
- **WHEN** a notified entry's offer later sells out again and then frees up a second time
- **THEN** the system does not send that entry a second notification

### Requirement: Waitlist entries are isolated by tenant
A waitlist entry SHALL be scoped to the offer (and its owning Organization) it was submitted for, and no operation SHALL expose or notify entries belonging to a different Organization's offer.

#### Scenario: Notification is scoped to the correct offer's entries only
- **WHEN** one offer's capacity becomes newly available
- **THEN** only that offer's waitlist entries are considered for notification, never another offer's or another Organization's
