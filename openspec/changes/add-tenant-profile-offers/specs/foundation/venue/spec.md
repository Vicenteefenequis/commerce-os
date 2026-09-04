## ADDED Requirements

### Requirement: Venue age restriction is owner-editable
The system SHALL allow an authorized actor within a Venue's owning Organization to set and update that Venue's `ageRestriction` (optional, non-negative integer, e.g. `18`), independently of its other profile fields.

#### Scenario: Owner sets an age restriction
- **WHEN** an authorized actor within the Venue's Organization submits a non-negative integer `ageRestriction`
- **THEN** the system updates the Venue with that value

#### Scenario: Negative age restriction is rejected
- **WHEN** an authorized actor submits a negative `ageRestriction` value
- **THEN** the system rejects the update and the Venue's stored value is unchanged

#### Scenario: Venue without an age restriction omits it from display
- **WHEN** a Venue has no `ageRestriction` set
- **THEN** the system treats it as having no age restriction, without error, on any read
