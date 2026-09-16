## MODIFIED Requirements

### Requirement: Dashboard is the default admin landing screen
An authenticated admin session with no other destination requested SHALL land on the Dashboard screen after login when their role permits dashboard access. A session whose role does not permit dashboard access SHALL land on the first admin screen their role does permit.

#### Scenario: Login redirects to dashboard
- **WHEN** an Admin completes login without a prior destination in mind
- **THEN** the admin UI navigates to the Dashboard screen

#### Scenario: Login redirects a restricted role away from the dashboard
- **WHEN** a Vendedor or Validador completes login without a prior destination in mind
- **THEN** the admin UI navigates to the first screen their role permits, not the Dashboard

## ADDED Requirements

### Requirement: Dashboard access is restricted to the Admin role
The system SHALL deny dashboard summary requests from any identity whose role is Gerente, Vendedor, or Validador, regardless of frontend restrictions.

#### Scenario: Gerente request is denied
- **WHEN** an identity holding only the Gerente role requests the dashboard summary directly against the API
- **THEN** the system denies the request

#### Scenario: Vendedor or Validador request is denied
- **WHEN** an identity holding only the Vendedor or Validador role requests the dashboard summary directly against the API
- **THEN** the system denies the request

#### Scenario: Admin request is allowed
- **WHEN** an identity holding the Admin role requests the dashboard summary
- **THEN** the system returns the summary as already specified
