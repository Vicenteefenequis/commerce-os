## ADDED Requirements

### Requirement: Storefront venue listing includes the organization name
The system SHALL include the owning Organization's name alongside the Venue list returned by the storefront venue listing, so a consumer can see which business they are browsing.

#### Scenario: Venue listing includes the organization name
- **WHEN** an unauthenticated request lists Venues for a tenant that exists
- **THEN** the response includes that Organization's name in addition to its Venues
