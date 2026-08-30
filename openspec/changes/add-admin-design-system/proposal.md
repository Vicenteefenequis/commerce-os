## Why

`apps/web` has no CSS framework, no design tokens, and no component library — every admin screen would invent its own styling from scratch. Before building CRUD screens to visually test the Foundation/Catalog/Capacity APIs, the admin needs a shared design system (tokens, base components, layout patterns) so those screens are consistent and fast to build, instead of accumulating one-off styling per screen.

## What Changes

- Install and configure Tailwind CSS for `apps/web` (tokens: color, typography, spacing, radius).
- Install Radix UI primitives for unstyled, accessible interactive components (dialog, dropdown, select, tabs, toast).
- Build a small base component library on top of Radix + Tailwind: Button, Input, Select, Table, Dialog/Modal, Toast, Badge, Card, and a page-level layout shell (nav + content area) for admin screens.
- Define layout patterns for the two CRUD screen shapes the admin will need repeatedly: list view (table + filters + create action) and form view (create/edit with validation error display).
- Apply a light/dark-aware color palette using CSS custom properties driven by Tailwind theme tokens (not hardcoded hex values in components).

Out of scope for this change:
- The actual CRUD screens for Organization/Venue/Product/Resource (a separate, follow-up change consumes this design system).
- Any consumer-facing (non-admin) UI.
- Backend changes of any kind.

## Capabilities

### New Capabilities
- `admin/design-system`: The shared visual language and component library `apps/web` admin screens are built from — tokens, base components, and CRUD layout patterns.

### Modified Capabilities
(none — purely additive, no existing spec's behavior changes)

## Impact

- New dependencies in `apps/web`: `tailwindcss`, `@radix-ui/react-*` primitives, plus their build config (`tailwind.config.ts`, PostCSS).
- New `apps/web/app/globals.css` (or equivalent) importing Tailwind and defining CSS custom properties for the token palette.
- New `apps/web/components/ui/` directory (or similar) housing the base component library.
- `apps/web/app/layout.tsx` updated to import the global stylesheet and apply the base font/theme.
- No changes to `apps/backend` or any existing API contract.
