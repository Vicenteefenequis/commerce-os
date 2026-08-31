## ADDED Requirements

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
