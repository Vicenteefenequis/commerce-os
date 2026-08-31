# ticketing/entitlement Specification

## Purpose

Represents a single purchased right of entry granted to a Customer, issued when its Order is paid and consumed later by Access Control.

## Requirements

### Requirement: Entitlement is issued one per purchased unit
The system SHALL issue exactly one Entitlement per unit of quantity on a paid Order's lines, each granting a single use.

#### Scenario: Order line quantity issues one Entitlement per unit
- **WHEN** an Order with a line of quantity 3 transitions to `paid`
- **THEN** the system issues 3 independent Entitlements, one per unit, each with a single use

### Requirement: Entitlement issuance is triggered by payment
The system SHALL issue Entitlements for an Order's lines when that Order transitions to `paid`, and SHALL NOT issue them at any earlier status.

#### Scenario: Entitlements are not issued before payment
- **WHEN** an Order is `draft` or `awaiting_payment`
- **THEN** the system has issued no Entitlement for that Order

#### Scenario: Entitlements are issued on payment
- **WHEN** an Order transitions to `paid`
- **THEN** the system issues one Entitlement per unit across all of its lines

### Requirement: Entitlement issuance is not duplicated
The system SHALL issue Entitlements for a given Order at most once, even if the paid transition is observed more than once.

#### Scenario: Duplicate payment notification does not double-issue
- **WHEN** the system observes an Order's transition to `paid` more than once for the same Order
- **THEN** it issues each unit's Entitlement only once

### Requirement: Entitlement references its Order and Customer
Every Entitlement SHALL reference the Order line it was issued from and the Customer who purchased it.

#### Scenario: Entitlement carries its provenance
- **WHEN** an Entitlement is issued
- **THEN** it references the Order, the specific Order line, and the Customer who purchased it

### Requirement: Entitlement belongs to a single tenant
An Entitlement SHALL be readable only by identities authorized within its owning Organization.

#### Scenario: Entitlement is isolated by tenant
- **WHEN** a user from Organization A attempts to read an Entitlement belonging to Organization B
- **THEN** the system denies the operation

### Requirement: Entitlement is consumed exactly once via Access Control
An Entitlement with status `issued` SHALL transition to `consumed` at most once, only through the Access Control scan flow, and never through any other write path.

#### Scenario: Successful scan consumes the Entitlement
- **WHEN** Access Control authorizes an entry attempt against an `issued` Entitlement
- **THEN** the system atomically transitions it to `consumed`

#### Scenario: Concurrent scans on the same Entitlement resolve to a single consumption
- **WHEN** two scan attempts race against the same `issued` Entitlement
- **THEN** exactly one attempt transitions it to `consumed`; the other has no effect on its status

### Requirement: Consumed Entitlement rejects further scans
Once an Entitlement's status is `consumed`, further scan attempts against it SHALL be denied and SHALL NOT change its status.

#### Scenario: Rescanning a consumed Entitlement
- **WHEN** a scan attempt targets an Entitlement whose status is already `consumed`
- **THEN** the system denies entry and reports it as already used, without altering the Entitlement
