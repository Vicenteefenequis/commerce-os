## MODIFIED Requirements

### Requirement: Hero section shows an animated platform flow mockup
The Hero section SHALL include a visual mockup depicting the platform's capability — a sales overview panel (with a chart and key metrics) and an access-check/"Portaria" panel — alongside a headline, subheadline, and a primary CTA. The mockup SHALL communicate what the platform does today, not a step-by-step "future flow" walkthrough.

#### Scenario: Hero animation is present
- **WHEN** a visitor views the Hero section
- **THEN** the section displays a headline, a subheadline, the capability mockup, and a primary CTA control

## ADDED Requirements

### Requirement: Landing copy presents functionality and differentiation, not pilot/exploratory framing
Visible landing page copy (badges, headings, CTAs, FAQ answers) SHALL NOT describe the platform as a pilot program, a work-in-progress MVP, or otherwise frame visitors as testers being recruited. Copy SHALL instead describe what the platform does and why it differs from standalone ticketing systems.

#### Scenario: No pilot/MVP language is visible
- **WHEN** a visitor reads any section of the landing page (hero badge, header CTA, hero CTA, final CTA section, FAQ)
- **THEN** no text uses "piloto," "programa piloto," or "MVP" to describe the platform's maturity or the visitor's role

#### Scenario: FAQ answers describe current capability
- **WHEN** a visitor reads the FAQ answer about production readiness
- **THEN** the answer describes what the platform does today (offers, capacity, checkout, ticket/QR issuance) without referring to a pilot phase
