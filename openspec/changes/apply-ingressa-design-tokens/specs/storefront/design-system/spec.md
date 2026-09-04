## Purpose

Defines the shared visual language and component library storefront (consumer-facing, `/loja/...`) screens are built from — tokens, base components, and responsive shell patterns — independent of `admin/design-system`, so discovery, tenant-profile, checkout, and ticket screens are visually and behaviorally consistent without each one reinventing styling.

## ADDED Requirements

### Requirement: Storefront tokens are isolated from admin tokens
The storefront (`/loja/...`) SHALL derive color, typography, spacing, and radius values from its own token set, distinct from `admin/design-system`'s tokens, such that a change to one token set never visually affects the other.

#### Scenario: Admin token change does not affect storefront
- **WHEN** a token value in `admin/design-system`'s token set is changed
- **THEN** no storefront screen's rendered appearance changes

#### Scenario: Storefront token change does not affect admin
- **WHEN** a token value in the storefront token set is changed
- **THEN** no admin screen's rendered appearance changes

### Requirement: Consistent storefront design tokens
All storefront UI SHALL derive color, typography, spacing, and radius values from the shared storefront token set rather than component-local hardcoded values.

#### Scenario: Token change propagates everywhere
- **WHEN** a storefront token value (e.g. the accent color) is changed
- **THEN** every storefront component using that token reflects the new value without per-component edits

### Requirement: Capacity bar has a single shared color rule
The system SHALL provide one `CapacityBar` component whose fill color is determined solely by percentage-full (normal below 70%, warning between 70% and 90%, critical above 90%, and a distinct sold-out state at 100%), used identically wherever capacity is shown.

#### Scenario: Same percentage renders the same color everywhere
- **WHEN** two different screens display a capacity bar for the same percentage-full value
- **THEN** both render the same color band

#### Scenario: Sold-out state is visually distinct from critical
- **WHEN** a capacity bar represents zero remaining capacity
- **THEN** it renders in the sold-out state, visually distinct from the below-100%-but-critical band

### Requirement: Base storefront components are presentational
`VenueCard`, `CapacityBar`, `Badge`, `LoteRow`, `OfferRow`, and `FilterChip` SHALL accept only resolved, primitive-typed props and SHALL NOT perform data fetching or embed knowledge of any specific API response shape.

#### Scenario: Component renders from plain props alone
- **WHEN** any base storefront component is rendered with a plain object of primitive props (strings, numbers, booleans)
- **THEN** it renders correctly with no network request and no dependency on a specific backend contract

### Requirement: Two responsive shell patterns
The system SHALL provide a desktop shell (persistent left filter rail plus main content area) and a mobile shell (filter chips plus a bottom sheet for expanded filters), both composable with the same base components.

#### Scenario: Desktop shell keeps filters persistent
- **WHEN** a screen is composed inside the desktop shell
- **THEN** the filter rail remains visible and interactive while the main content scrolls

#### Scenario: Mobile shell collapses filters into chips and a sheet
- **WHEN** a screen is composed inside the mobile shell
- **THEN** active filters render as chips and full filter controls are reachable via a bottom sheet, not a persistent rail

### Requirement: Storefront fonts are self-hosted
The storefront SHALL load its typefaces (Archivo, JetBrains Mono) via Next.js font optimization rather than a runtime third-party stylesheet request.

#### Scenario: No runtime Google Fonts request
- **WHEN** a storefront page loads
- **THEN** no request is made to `fonts.googleapis.com` or `fonts.gstatic.com` at runtime; the fonts are served from the app's own origin
