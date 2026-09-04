## Purpose

Gives an anonymous consumer a public, presentation-oriented profile page for a single Venue - photo, description, and location - reachable by direct link independent of publish status, with a path onward into the existing purchase flow.

## ADDED Requirements

### Requirement: Showcase page is public and account-less
The system SHALL provide a public, account-less page at `/vitrine/[tenantSlug]/[venueSlug]` displaying a Venue's profile: name, category, city, address, description, and cover photo (when set), identified by the tenant's slug and the venue's slug.

#### Scenario: Showcase page renders a venue's profile
- **WHEN** an unauthenticated consumer opens a Venue's showcase page, identified by tenant slug and venue slug
- **THEN** the page displays that Venue's name, and its category, city, address, description, and cover photo fields when set

#### Scenario: Unset profile fields are omitted, not shown as errors
- **WHEN** a Venue's showcase page is opened and a profile field (category, city, address, description, or cover photo) is not set
- **THEN** the page omits that field without showing an error or placeholder text implying missing data

### Requirement: Showcase page is reachable regardless of publish status
The system SHALL serve a Venue's showcase page to any visitor with its direct link whether or not that Venue's `published` flag is `true`.

#### Scenario: Unpublished venue's showcase page still loads by direct link
- **WHEN** an unauthenticated consumer opens the showcase page of a Venue with `published = false`, via its direct link
- **THEN** the system renders the showcase page normally

### Requirement: Showcase page links to the purchase flow
The system SHALL provide, on the showcase page, a call-to-action that navigates the consumer to that Venue's existing storefront purchase page.

#### Scenario: Consumer follows the purchase call-to-action
- **WHEN** an unauthenticated consumer activates the "buy" call-to-action on a Venue's showcase page
- **THEN** the system navigates the consumer to that Venue's storefront purchase page (`storefront/catalog`, `storefront/checkout`)

### Requirement: Missing tenant or venue shows a clear not-found state
The system SHALL show a clear, non-broken message instead of an empty or errored page when the tenant or venue does not exist.

#### Scenario: Unknown tenant or venue slug
- **WHEN** an unauthenticated consumer opens a showcase page for a tenant slug or venue slug that does not resolve to an existing Venue
- **THEN** the system shows a "not found" message and does not error or show a blank page

### Requirement: Showcase page is isolated by tenant
The system SHALL scope the showcase page to the Venue identified by the tenant and venue slugs in the request and SHALL NOT display another tenant's Venue data.

#### Scenario: Showcase page is isolated by tenant
- **WHEN** an unauthenticated consumer opens Organization A's Venue showcase page
- **THEN** the system displays only that Venue's data, never a Venue belonging to Organization B
