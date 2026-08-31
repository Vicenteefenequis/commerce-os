## Purpose

Validates a Ticket presented at the door against its Entitlement and the operator's active Venue for the scanning session, and atomically consumes the Entitlement on a successful check so the same right of entry can never grant access twice.

## ADDED Requirements

### Requirement: Scan is evaluated against an explicitly selected Venue
Every scan request SHALL carry the Venue the operator is currently checking entries for. The system SHALL NOT infer the operator's Venue from their identity or role.

#### Scenario: Scan without a selected Venue is rejected
- **WHEN** a scan request does not carry a Venue
- **THEN** the system rejects the request without evaluating the Ticket

### Requirement: Ticket code resolves to its Entitlement without granting access
The system SHALL resolve a scanned code to the Ticket and Entitlement it references. The code alone SHALL NOT authorize entry; authorization is decided by evaluating the Entitlement's state against the scan.

#### Scenario: Unknown or malformed code
- **WHEN** a scanned code does not match any Ticket in the system
- **THEN** the system reports the attempt as invalid and consumes nothing

### Requirement: Scan outcome is classified unambiguously
Every scan SHALL resolve to exactly one outcome: authorized, already used, invalid, wrong venue, wrong time, or expired.

#### Scenario: Valid, unused, matching Entitlement
- **WHEN** a scanned Ticket's Entitlement is `issued`, belongs to the scan's Venue, and (when time-bound) is within its Reservation's period
- **THEN** the system reports the attempt as authorized

#### Scenario: Entitlement already consumed
- **WHEN** a scanned Ticket's Entitlement has status `consumed`
- **THEN** the system reports the attempt as already used

### Requirement: Wrong venue is detected against the Order's Venue
The system SHALL compare the scan's Venue to the Venue of the Order that produced the Entitlement, independent of any Resource or Reservation.

#### Scenario: Ticket scanned at a different Venue than it was sold for
- **WHEN** the scan's Venue differs from the Venue of the Entitlement's Order
- **THEN** the system reports the attempt as wrong venue, regardless of the Entitlement's other state

### Requirement: Wrong time and expired are detected only for Reservation-backed Entitlements
When the Entitlement's Order line references a Reservation, the system SHALL compare the scan's time against that Reservation's period. A scan before the period starts SHALL be reported as wrong time; a scan after the period ends SHALL be reported as expired. When the Order line has no Reservation, the system SHALL NOT apply either check.

#### Scenario: Scan before a Reservation's period starts
- **WHEN** the Entitlement's Order line has a Reservation and the scan occurs before that Reservation's period starts
- **THEN** the system reports the attempt as wrong time

#### Scenario: Scan after a Reservation's period ends
- **WHEN** the Entitlement's Order line has a Reservation and the scan occurs after that Reservation's period ends
- **THEN** the system reports the attempt as expired

#### Scenario: Scan for an Entitlement with no Reservation
- **WHEN** the Entitlement's Order line has no Reservation
- **THEN** the system does not reject the scan for wrong time or expired reasons

### Requirement: Successful scan consumes the Entitlement atomically
An authorized scan SHALL transition its Entitlement from `issued` to `consumed` as a single atomic operation, and SHALL do so at most once per Entitlement even under concurrent attempts.

#### Scenario: Concurrent scans of the same Entitlement
- **WHEN** two scan attempts race against the same `issued` Entitlement
- **THEN** exactly one is reported as authorized and consumes it; the other is reported as already used

### Requirement: Every scan attempt is recorded
The system SHALL record every scan attempt, whether authorized or not, including its outcome.

#### Scenario: Denied attempt is still recorded
- **WHEN** a scan is denied for any reason (already used, invalid, wrong venue, wrong time)
- **THEN** the system records the attempt with that outcome

### Requirement: Scanning requires the entitlement:consume permission
Scan requests SHALL be authorized server-side and denied for any identity lacking the `entitlement:consume` permission, regardless of frontend restrictions.

#### Scenario: Identity without permission attempts a scan
- **WHEN** an identity lacking `entitlement:consume` sends a scan request directly to the API
- **THEN** the system denies the request

### Requirement: Access Control is isolated by tenant
A scan SHALL only be evaluated against Tickets and Entitlements belonging to the acting identity's own Organization.

#### Scenario: Scan targets a Ticket from another Organization
- **WHEN** a scan request resolves a code to a Ticket belonging to an Organization other than the caller's own
- **THEN** the system denies the operation as if the Ticket did not exist
