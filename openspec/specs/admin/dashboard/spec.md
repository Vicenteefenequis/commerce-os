# admin/dashboard Specification

## Purpose

Gives a pilot establishment a single place to see how the business is doing - sales, orders, and visitor entries - without querying the database directly, closing the MVP's final Definition of Done items.

## Requirements

### Requirement: Dashboard summary is scoped by tenant, venue, and period
The system SHALL provide a summary of sales, orders, and visitor entries for the requesting identity's Organization, filterable by an optional Venue and a required date range.

#### Scenario: Summary defaults to all venues
- **WHEN** an authorized actor requests the dashboard summary for a date range without specifying a Venue
- **THEN** the summary aggregates data across every Venue belonging to that actor's Organization

#### Scenario: Summary scoped to one venue
- **WHEN** an authorized actor requests the dashboard summary for a date range with a specific Venue
- **THEN** the summary aggregates only data belonging to that Venue

#### Scenario: Summary is isolated by tenant
- **WHEN** a user from Organization A requests the dashboard summary
- **THEN** the system returns figures computed only from Organization A's data, never from another Organization's

### Requirement: Summary reports sales figures
The summary SHALL report the GMV (sum of order totals for Orders in status `paid`, `fulfilled`, `partially_refunded`, or `refunded`, using the refunded status's pre-refund total) and the average order value for the requested period.

#### Scenario: GMV includes paid and fulfilled orders
- **WHEN** the requested period contains Orders in status `paid`, `fulfilled`, `partially_refunded`, and `refunded`
- **THEN** the reported GMV is the sum of those Orders' totals

#### Scenario: GMV excludes unpaid and cancelled orders
- **WHEN** the requested period contains Orders in status `draft`, `awaiting_payment`, `cancelled`, or `expired`
- **THEN** those Orders' totals are excluded from the reported GMV

#### Scenario: No sales in period
- **WHEN** the requested period has no Orders in a GMV-counted status
- **THEN** the reported GMV is zero and the average order value is zero

### Requirement: Summary reports order counts by status
The summary SHALL report the count of Orders created in the requested period, broken down by status.

#### Scenario: Order counts reflect period activity
- **WHEN** the requested period contains Orders in multiple statuses
- **THEN** the summary reports a count for each status present, matching the number of Orders created in that period with that status

### Requirement: Summary reports visitor entries
The summary SHALL report the count of scan attempts with outcome `authorized` (successful entries) within the requested period, distinct from the number of Tickets or Entitlements issued.

#### Scenario: Visitor count reflects successful entries only
- **WHEN** the requested period contains scan attempts with outcomes `authorized`, `already_used`, `invalid`, `wrong_venue`, `wrong_time`, and `expired`
- **THEN** the reported visitor count includes only the `authorized` attempts

#### Scenario: No entries in period
- **WHEN** the requested period has no `authorized` scan attempts
- **THEN** the reported visitor count is zero

### Requirement: Summary reports sales figures by channel
The dashboard summary SHALL additionally report GMV and order count broken out by Order channel (`storefront`/"platform" versus `counter`/"manual"), alongside the existing period totals.

#### Scenario: Summary splits GMV by channel
- **WHEN** the requested period contains GMV-counted Orders from both the `storefront` and `counter` channels
- **THEN** the summary reports GMV for each channel separately, in addition to the combined total

#### Scenario: Summary splits order and ticket counts by channel
- **WHEN** the requested period contains Orders from both the `storefront` and `counter` channels
- **THEN** the summary reports order and Ticket counts for each channel separately, in addition to the combined totals

#### Scenario: One channel has no activity in the period
- **WHEN** the requested period has no Orders from one of the two channels
- **THEN** that channel's reported GMV and counts are zero, and the other channel's figures are unaffected

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

### Requirement: Dashboard is the default admin landing screen
An authenticated admin session with no other destination requested SHALL land on the Dashboard screen after login when their role permits dashboard access. A session whose role does not permit dashboard access SHALL land on the first admin screen their role does permit.

#### Scenario: Login redirects to dashboard
- **WHEN** an Admin completes login without a prior destination in mind
- **THEN** the admin UI navigates to the Dashboard screen

#### Scenario: Login redirects a restricted role away from the dashboard
- **WHEN** a Vendedor or Validador completes login without a prior destination in mind
- **THEN** the admin UI navigates to the first screen their role permits, not the Dashboard
