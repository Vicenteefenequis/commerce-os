## MODIFIED Requirements

### Requirement: Consistent design tokens
All admin UI SHALL derive color, typography, spacing, and radius values from a single shared token set rather than component-local hardcoded values. This token set SHALL also be the source of truth for the public marketing surface (landing page), so a brand color or font change applies consistently to both the admin application and the marketing site.

#### Scenario: Token change propagates everywhere
- **WHEN** a token value (e.g. the primary color) is changed in the shared token set
- **THEN** every component using that token reflects the new value without per-component edits, across both the admin application and the marketing landing page

#### Scenario: New component reuses existing tokens
- **WHEN** a new admin screen or component is built
- **THEN** it is visually consistent with existing screens by construction, using the same token set

#### Scenario: Marketing surface reuses the same token set
- **WHEN** the marketing landing page renders a section using a brand, neutral, or accent color
- **THEN** it reads that value from the same shared token set the admin UI uses, not a separate marketing-only palette
