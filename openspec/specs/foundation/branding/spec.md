# foundation/branding Specification

## Purpose

Defines the platform's canonical name and visual mark, and requires every surface that presents the platform's identity to source it from one shared representation rather than ad hoc, per-surface text or graphics.

## Requirements

### Requirement: Platform is named Ingressafluxo
The system SHALL identify the platform as "Ingressafluxo" (wordmark: "Ingressa" in a heavier weight immediately followed by "fluxo" in a lighter, muted weight, rendered as a single word with no space) in all user-facing text and metadata. No user-facing surface SHALL display the platform's prior name ("Commerce OS").

#### Scenario: Browser tab shows the new name
- **WHEN** a visitor loads any page of the application
- **THEN** the browser tab title includes "Ingressafluxo" and does not include "Commerce OS"

#### Scenario: No surface references the old name
- **WHEN** the marketing site, admin console, or platform console is rendered
- **THEN** no visible text reads "Commerce OS"

### Requirement: Shared Logo component renders the brand mark
The system SHALL provide one shared component that renders the platform's icon (a gate/arrow mark) and wordmark together, and every navigational or identifying surface (marketing header, marketing footer, admin navigation, platform console navigation) SHALL render the brand identity through that component rather than independently authored markup or text.

#### Scenario: Brand mark is visually consistent across surfaces
- **WHEN** the brand mark is displayed in the marketing header, the admin navigation, and the platform console navigation
- **THEN** the icon and wordmark render identically (same styling) in all three locations

#### Scenario: A future mark update propagates everywhere
- **WHEN** the shared Logo component's icon or wordmark markup is changed
- **THEN** every surface using the component reflects the change without per-surface edits

### Requirement: Platform has a favicon matching the brand mark
The system SHALL serve a favicon derived from the platform's icon so the browser tab visually identifies the application.

#### Scenario: Favicon is present
- **WHEN** any page of the application is loaded in a browser
- **THEN** the browser tab displays a favicon derived from the Ingressafluxo icon
