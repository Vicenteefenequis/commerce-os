## ADDED Requirements

### Requirement: Venue location coordinates are owner-editable
The system SHALL allow an authorized actor within a Venue's owning Organization to set and update that Venue's `latitude` and `longitude` (each optional, numeric, and valid geographic coordinates when set), independently of its other profile fields.

#### Scenario: Owner sets venue coordinates
- **WHEN** an authorized actor within the Venue's Organization submits valid `latitude` and `longitude` values
- **THEN** the system updates the Venue with those coordinates

#### Scenario: Invalid coordinates are rejected
- **WHEN** an authorized actor submits a `latitude` outside [-90, 90] or a `longitude` outside [-180, 180]
- **THEN** the system rejects the update and the Venue's stored coordinates are unchanged

#### Scenario: Venue without coordinates is valid
- **WHEN** a Venue has never had `latitude`/`longitude` set
- **THEN** the system treats it as a venue with unknown location, without error, for any read that uses location
