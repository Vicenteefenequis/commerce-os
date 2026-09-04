# admin/design-system Specification

## Purpose

Defines the shared visual language and component behavior every admin screen in `apps/web` is built from, so screens built against Foundation/Catalog/Capacity APIs are visually and behaviorally consistent without each one reinventing styling, accessibility, or state handling.

## Requirements

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

### Requirement: Light and dark theme support
The admin UI SHALL render correctly in both a light and a dark theme, following the user's OS/browser preference by default.

#### Scenario: Theme follows system preference
- **WHEN** the admin is opened with no explicit theme override and the OS is set to dark mode
- **THEN** the admin renders in the dark theme with all tokens (including text/background contrast) applied consistently

### Requirement: Accessible interactive components
Interactive components (dialogs, dropdowns, selects, tabs) SHALL be operable via keyboard and expose correct ARIA semantics, not only mouse/touch.

#### Scenario: Dialog is keyboard-operable
- **WHEN** a dialog (e.g. a confirmation or a create/edit modal) is open
- **THEN** focus is trapped within it, Escape closes it, and focus returns to the triggering element on close

#### Scenario: Dropdown/select is keyboard-navigable
- **WHEN** a user operates a dropdown or select component using only the keyboard
- **THEN** they can open it, move between options with arrow keys, and select an option with Enter

### Requirement: CRUD list layout pattern
A resource list screen (e.g. venues, products, resources) SHALL follow a consistent layout: a table of records, a primary action to create a new record, and a distinguishable empty state when there are no records.

#### Scenario: Empty list shows a clear empty state
- **WHEN** a list screen has zero records to show
- **THEN** it displays an explicit empty state (not a blank table) that includes the primary create action

#### Scenario: List screen exposes a create action
- **WHEN** a user is authorized to create a record of the listed resource type
- **THEN** a create action is visible and reachable from the list screen

### Requirement: CRUD form layout pattern
A resource create/edit screen SHALL follow a consistent layout: labeled fields, inline validation error display tied to the specific field, and a persistent submit/cancel action pair.

#### Scenario: Field-level API validation errors are shown inline
- **WHEN** a create/edit submission is rejected by the backend with a field-specific error
- **THEN** the error is displayed next to the corresponding field, not only as a generic top-level message

#### Scenario: Form distinguishes unsaved changes from saved state
- **WHEN** a user has made edits that have not yet been submitted
- **THEN** the form provides a clear way to submit or discard those changes before navigating away

### Requirement: Consistent async operation feedback
Every action that triggers a network request (create, update, delete, list refresh) SHALL communicate its in-progress, success, and failure states through a consistent, shared pattern rather than ad hoc per-screen handling.

#### Scenario: In-progress action disables duplicate submission
- **WHEN** a create/update/delete request is in flight
- **THEN** the triggering action is disabled or visibly indicates loading, preventing a duplicate submission

#### Scenario: Failed action surfaces a recoverable error
- **WHEN** a network request fails (validation error, permission denied, server error)
- **THEN** the user sees a clear, non-blocking indication of the failure and can retry without reloading the page
