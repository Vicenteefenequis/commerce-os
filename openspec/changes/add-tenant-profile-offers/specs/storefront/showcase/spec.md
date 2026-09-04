## ADDED Requirements

### Requirement: Showcase page presents offers, about, and location as tabs
The storefront purchase page SHALL organize a Venue's profile and its currently-available offers into three tabs — Ofertas (default, selected on load), Sobre, and Localização — on every breakpoint.

#### Scenario: Ofertas tab is selected by default
- **WHEN** an unauthenticated consumer opens a Venue's storefront purchase page
- **THEN** the Ofertas tab is shown selected, listing that Venue's currently-available offers

#### Scenario: Sobre tab shows description and category
- **WHEN** a consumer selects the Sobre tab
- **THEN** the page shows the Venue's description, category, and age restriction (when set)

#### Scenario: Localização tab shows address
- **WHEN** a consumer selects the Localização tab
- **THEN** the page shows the Venue's address and city

#### Scenario: Tab count does not vary by breakpoint
- **WHEN** the showcase page is viewed on a mobile or desktop breakpoint
- **THEN** the same three tabs (Ofertas, Sobre, Localização) are shown on both

### Requirement: Ofertas tab lists each available product as a dated offer
The Ofertas tab SHALL list every Product visible to the storefront channel and currently available for that Venue (per `storefront/catalog`), each shown with its availability date/time, an aggregate capacity indicator when it has resource-backed variants, and its lowest variant price.

#### Scenario: Offer shows date, capacity, and price
- **WHEN** the Ofertas tab lists a Product with resource-backed variants
- **THEN** that offer's row shows its date/time, a capacity indicator, and its lowest price

#### Scenario: Offer without resource-backed variants omits the capacity indicator
- **WHEN** the Ofertas tab lists a Product with no resource-backed variants
- **THEN** that offer's row omits the capacity indicator and shows only its date/time and price

#### Scenario: No available offers shows an explicit empty state
- **WHEN** a Venue currently has no storefront-visible, available Products
- **THEN** the Ofertas tab shows a message indicating there are no offers right now, rather than an empty list

### Requirement: Profile stat tiles summarize active offers
The showcase page SHALL display, above the tabs, the count of currently-available offers and the aggregate remaining capacity across them.

#### Scenario: Stat tiles reflect current offers
- **WHEN** a Venue has three currently-available offers
- **THEN** the stat tiles show a count of three active offers and their combined remaining capacity

## MODIFIED Requirements

### Requirement: Showcase page renders a venue's profile
The system SHALL render a Venue's profile — name, category, city, address, description, and cover photo (when set) — as part of the storefront purchase page at `/loja/[tenantSlug]/[venueSlug]`, identified by the tenant's slug and the venue's slug, organized into the Ofertas/Sobre/Localização tabs, instead of on a separate showcase-only page or as a single flat block.

#### Scenario: Showcase page renders a venue's profile
- **WHEN** an unauthenticated consumer opens a Venue's storefront purchase page, identified by tenant slug and venue slug
- **THEN** the page displays that Venue's name and cover photo above the tabs, and its category, city, address, and description fields (when set) within the appropriate tab

#### Scenario: Unset profile fields are omitted, not shown as errors
- **WHEN** a Venue's storefront purchase page is opened and a profile field (category, city, address, description, cover photo, or age restriction) is not set
- **THEN** the page omits that field without showing an error or placeholder text implying missing data
