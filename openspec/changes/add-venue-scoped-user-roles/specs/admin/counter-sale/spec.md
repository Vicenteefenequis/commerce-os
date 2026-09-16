## MODIFIED Requirements

### Requirement: Counter sale requires an authenticated admin session
The system SHALL allow a counter sale to be created only by an identity holding the Admin role for the sale's Organization, or the Vendedor role scoped to the sale's Venue. The system SHALL deny the operation for any other identity, including an authenticated session whose role does not grant this permission.

#### Scenario: Unauthenticated request cannot create a counter sale
- **WHEN** a request without a valid admin session attempts to create a counter sale
- **THEN** the system denies the operation

#### Scenario: Any authenticated admin session can create a counter sale
- **WHEN** an authenticated admin session for an Organization submits a valid counter sale
- **THEN** the system creates it only if that session holds the Admin role, or the Vendedor role scoped to the sale's Venue; otherwise the system denies the operation

#### Scenario: Admin session can create a counter sale for any Venue
- **WHEN** an identity holding the Admin role submits a valid counter sale for any Venue in their Organization
- **THEN** the system creates it

#### Scenario: Vendedor session can create a counter sale for their assigned Venue
- **WHEN** an identity holding the Vendedor role scoped to Venue A submits a valid counter sale for Venue A
- **THEN** the system creates it

#### Scenario: Vendedor session is denied for a Venue they are not assigned to
- **WHEN** an identity holding the Vendedor role scoped to Venue A submits a counter sale for Venue B
- **THEN** the system denies the operation

#### Scenario: Gerente or Validador session is denied
- **WHEN** an identity holding only the Gerente or Validador role attempts to create a counter sale
- **THEN** the system denies the operation
