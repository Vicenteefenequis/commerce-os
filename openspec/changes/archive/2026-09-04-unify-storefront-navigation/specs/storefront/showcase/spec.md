## MODIFIED Requirements

### Requirement: Showcase page is public and account-less
The system SHALL render a Venue's profile — name, category, city, address, description, and cover photo (when set) — as part of the storefront purchase page at `/loja/[tenantSlug]/[venueSlug]`, identified by the tenant's slug and the venue's slug, instead of on a separate showcase-only page.

#### Scenario: Showcase page renders a venue's profile
- **WHEN** an unauthenticated consumer opens a Venue's storefront purchase page, identified by tenant slug and venue slug
- **THEN** the page displays that Venue's name, and its category, city, address, description, and cover photo fields when set, above the ticket-selection UI

#### Scenario: Unset profile fields are omitted, not shown as errors
- **WHEN** a Venue's storefront purchase page is opened and a profile field (category, city, address, description, or cover photo) is not set
- **THEN** the page omits that field without showing an error or placeholder text implying missing data

### Requirement: Showcase page is reachable regardless of publish status
The system SHALL serve a Venue's storefront purchase page (with its profile content) to any visitor with its direct link whether or not that Venue's `published` flag is `true`.

#### Scenario: Unpublished venue's showcase page still loads by direct link
- **WHEN** an unauthenticated consumer opens the storefront purchase page of a Venue with `published = false`, via its direct link
- **THEN** the system renders the page's profile content normally

### Requirement: Missing tenant or venue shows a clear not-found state
The system SHALL show a clear, non-broken message instead of an empty or errored page when the tenant or venue does not exist.

#### Scenario: Unknown tenant or venue slug
- **WHEN** an unauthenticated consumer opens a storefront purchase page for a tenant slug or venue slug that does not resolve to an existing Venue
- **THEN** the system shows a "not found" message and does not error or show a blank page

### Requirement: Showcase page is isolated by tenant
The system SHALL scope a Venue's profile content to the Venue identified by the tenant and venue slugs in the request and SHALL NOT display another tenant's Venue data.

#### Scenario: Showcase page is isolated by tenant
- **WHEN** an unauthenticated consumer opens Organization A's Venue purchase page
- **THEN** the system displays only that Venue's data, never a Venue belonging to Organization B

## ADDED Requirements

### Requirement: Legacy showcase URL redirects to the purchase page
The system SHALL redirect any request to `/vitrine/[tenantSlug]/[venueSlug]` to `/loja/[tenantSlug]/[venueSlug]`, preserving the tenant slug and venue slug, so previously shared showcase links continue to work.

#### Scenario: Old showcase link redirects
- **WHEN** a visitor opens a previously shared `/vitrine/[tenantSlug]/[venueSlug]` link
- **THEN** the system redirects them to `/loja/[tenantSlug]/[venueSlug]` for the same tenant and venue

## REMOVED Requirements

### Requirement: Showcase page links to the purchase flow
**Reason**: The showcase profile and the purchase flow are now the same screen (`/loja/[tenantSlug]/[venueSlug]`); there is no longer a separate page to link from.
**Migration**: None required — the "buy" call-to-action is replaced by the ticket-selection UI being immediately visible on the same page as the profile.
