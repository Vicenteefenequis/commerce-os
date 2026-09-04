## ADDED Requirements

### Requirement: Landing page provides a tenant search entry point
The landing page at `/` SHALL provide a consumer-facing tenant search input, presented alongside the page's existing business-recruitment sections, that lets a visitor search for a tenant by approximate name (see `storefront/discovery`) without leaving `/`.

#### Scenario: Search input is present on the landing page
- **WHEN** a visitor loads `/`
- **THEN** the page presents a tenant search input in addition to the Hero, Como Funciona, Diferencial, FAQ, and CTA sections

#### Scenario: Search input works on small viewports
- **WHEN** a visitor loads `/` at a viewport narrower than the tablet breakpoint
- **THEN** the tenant search input remains visible and usable, consistent with the header's collapsed-navigation pattern
