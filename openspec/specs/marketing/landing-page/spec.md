# marketing/landing-page Specification

## Purpose

Gives prospective establishments (zoos, aquariums, museums, parks, tourist attractions with limited-capacity operations) a public, unauthenticated entry point that explains the platform's functionality and differentiation, and captures their interest.

## Requirements

### Requirement: Marketing routes occupy the root path
The system SHALL serve the public marketing landing page at `/` and the institutional page at `/sobre`, both accessible without authentication. The existing admin application SHALL be served under the `/admin` prefix instead of the root path.

#### Scenario: Visiting the root path shows the landing page
- **WHEN** an unauthenticated visitor navigates to `/`
- **THEN** the system renders the marketing landing page, not the admin application

#### Scenario: Admin routes require the /admin prefix
- **WHEN** a user navigates to `/admin/login`, `/admin/venues`, `/admin/products`, or `/admin/resources`
- **THEN** the system renders the corresponding admin page that previously lived at the unprefixed path

#### Scenario: Old admin URLs no longer resolve to admin pages
- **WHEN** a user navigates to the pre-existing unprefixed paths `/login`, `/venues`, `/products`, or `/resources`
- **THEN** the system does not render the admin application at those paths

### Requirement: Landing page presents Hero, Como Funciona, Diferencial, FAQ, and CTA sections
The landing page SHALL present, in order: a Hero section with a primary call-to-action, a "Como Funciona" section, a "Diferencial" section, a FAQ section, and a final call-to-action section.

#### Scenario: All sections render on page load
- **WHEN** a visitor loads `/`
- **THEN** the page displays a Hero section, a Como Funciona section, a Diferencial section, a FAQ section, and a final CTA section, in that order

### Requirement: Hero section shows an animated platform flow mockup
The Hero section SHALL include a visual mockup depicting the platform's capability — a sales overview panel (with a chart and key metrics) and an access-check/"Portaria" panel — alongside a headline, subheadline, and a primary CTA. The mockup SHALL communicate what the platform does today, not a step-by-step "future flow" walkthrough.

#### Scenario: Hero animation is present
- **WHEN** a visitor views the Hero section
- **THEN** the section displays a headline, a subheadline, the capability mockup, and a primary CTA control

### Requirement: Landing copy presents functionality and differentiation, not pilot/exploratory framing
Visible landing page copy (badges, headings, CTAs, FAQ answers) SHALL NOT describe the platform as a pilot program, a work-in-progress MVP, or otherwise frame visitors as testers being recruited. Copy SHALL instead describe what the platform does and why it differs from standalone ticketing systems.

#### Scenario: No pilot/MVP language is visible
- **WHEN** a visitor reads any section of the landing page (hero badge, header CTA, hero CTA, final CTA section, FAQ)
- **THEN** no text uses "piloto," "programa piloto," or "MVP" to describe the platform's maturity or the visitor's role

#### Scenario: FAQ answers describe current capability
- **WHEN** a visitor reads the FAQ answer about production readiness
- **THEN** the answer describes what the platform does today (offers, capacity, checkout, ticket/QR issuance) without referring to a pilot phase

### Requirement: Diferencial section communicates the product's positioning
The Diferencial section SHALL communicate that the platform controls the full transaction and its operational context (not just ticket issuance), that capacity is a single source of truth, and that the platform is modular, API-first, and multi-tenant.

#### Scenario: Diferencial content is present
- **WHEN** a visitor views the Diferencial section
- **THEN** the section presents the platform's differentiator relative to standalone ticketing systems

### Requirement: Institutional page is reachable from marketing routes
The system SHALL provide an institutional page at `/sobre` reachable from the marketing route group.

#### Scenario: Visiting /sobre shows institutional content
- **WHEN** a visitor navigates to `/sobre`
- **THEN** the system renders the institutional page
