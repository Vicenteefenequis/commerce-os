# storefront/discovery Specification

## Purpose

Gives an anonymous consumer a cross-tenant search over published Venues - the platform's first storefront read that is not scoped to a single tenant - so a consumer with no prior link can find a place to buy tickets.

## Requirements

### Requirement: Discovery search is public and cross-tenant
The system SHALL provide a public, account-less search over Venues from every Organization, returning only Venues that meet the discovery eligibility rule, unlike every other storefront read which is scoped to a single tenant.

#### Scenario: Search returns eligible venues across tenants
- **WHEN** an unauthenticated consumer searches Venues with no filter applied
- **THEN** the system returns eligible Venues (per the discovery eligibility rule) from any Organization, each with its name, category, city, cover photo, and a link to its showcase page

### Requirement: Discovery eligibility rule
The system SHALL include a Venue in discovery search results only when all of the following hold: `published = true`; `coverPhotoUrl` is set; and the Venue has at least one Product that is visible on the `storefront` channel and available at the current time (the same visibility rule defined in `storefront/catalog`).

#### Scenario: Published venue with a photo and an available product is eligible
- **WHEN** a Venue has `published = true`, a non-empty `coverPhotoUrl`, and at least one Product visible on the `storefront` channel and available at the current time
- **THEN** the Venue appears in discovery search results

#### Scenario: Unpublished venue is excluded
- **WHEN** a Venue has `published = false`
- **THEN** the Venue is excluded from discovery search results regardless of its other fields

#### Scenario: Published venue without a cover photo is excluded
- **WHEN** a Venue has `published = true` but no `coverPhotoUrl` set
- **THEN** the Venue is excluded from discovery search results

#### Scenario: Published venue with no eligible product is excluded
- **WHEN** a Venue has `published = true` and a `coverPhotoUrl`, but no Product visible on the `storefront` channel and available at the current time
- **THEN** the Venue is excluded from discovery search results

### Requirement: Discovery search filters by city and category
The system SHALL allow the search to be narrowed by an exact `city` match and/or a `category` match, applied in addition to the discovery eligibility rule.

#### Scenario: Filtering by city
- **WHEN** an unauthenticated consumer searches Venues with a `city` filter
- **THEN** the system returns only eligible Venues whose `city` matches the filter value exactly

#### Scenario: Filtering by category
- **WHEN** an unauthenticated consumer searches Venues with a `category` filter
- **THEN** the system returns only eligible Venues whose `category` matches the filter value

#### Scenario: Combined city and category filters
- **WHEN** an unauthenticated consumer searches Venues with both a `city` filter and a `category` filter
- **THEN** the system returns only eligible Venues matching both filters

#### Scenario: No matching venues returns an empty result, not an error
- **WHEN** a search's filters match no eligible Venue
- **THEN** the system returns an empty result set without error

### Requirement: Discovery results link to the showcase page
Each Venue returned by a discovery search SHALL include a link to that Venue's showcase page.

#### Scenario: Search result links to showcase page
- **WHEN** a discovery search returns a Venue
- **THEN** that result includes a link to the Venue's showcase page (`storefront/showcase`), identified by its tenant slug and venue slug
