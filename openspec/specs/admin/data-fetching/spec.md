# admin/data-fetching Specification

## Purpose

Defines when `apps/web` admin screens must load and mutate data server-side versus when a client-side interaction is acceptable, so pages render with data on first response instead of a client-side fetch round-trip, while keeping mutations responsive and free of full-page reloads.

## Requirements

### Requirement: Server-side data loading for reads
An admin screen that displays list or detail data SHALL fetch that data server-side (in a Server Component, before the response is sent to the browser) rather than fetching it from a Client Component after mount.

#### Scenario: List screen renders with data on first response
- **WHEN** a user navigates to a list screen (e.g. venues, products, resources)
- **THEN** the initial HTML response already contains the record data, with no client-side loading state required to display it

#### Scenario: No client-side fetch for initial page data
- **WHEN** a list or detail screen's initial data is inspected
- **THEN** it was retrieved via a server-side call to the backend, not via a `fetch` executed in the browser after the page mounted

### Requirement: Server Actions for mutations
An admin screen that creates, updates, or deletes a record, or authenticates a user, SHALL perform that mutation through a Server Action rather than a client-side `fetch` call to a route handler.

#### Scenario: Form submission invokes a Server Action
- **WHEN** a user submits a create, edit, delete, or login form
- **THEN** the submission is handled by a Server Action that calls the backend directly, without the browser issuing a `fetch` to an intermediate `/api/*` route

#### Scenario: Mutation result revalidates affected data
- **WHEN** a Server Action mutation succeeds
- **THEN** the data views affected by that mutation are revalidated server-side so the user sees the updated state without a manual client-side re-fetch

### Requirement: Client Components scoped to interactive leaves
`"use client"` SHALL be applied only to the smallest component that owns interactive state (e.g. a dialog, an inline form, a toast) and SHALL receive its initial data via props from a Server Component, never by fetching it itself on mount.

#### Scenario: Page shell stays a Server Component
- **WHEN** a screen has both server-loaded data and an interactive element (e.g. a create dialog)
- **THEN** the page-level component remains a Server Component and only the interactive element is a Client Component

#### Scenario: Client-side fetch permitted only for non-data interactions
- **WHEN** a Client Component leaf needs behavior that does not represent page data (e.g. debounced input validation, a client-only preference), and using it does not require bypassing server-side loading of page data
- **THEN** a client-side `fetch` may be used for that narrow interaction without violating this policy

### Requirement: Credentials never reach the browser as a proxied call
Communication with the backend SHALL happen from server-side code (Server Component or Server Action) using the existing httpOnly session cookie forwarding, and SHALL NOT require the browser to call an intermediate Next.js route handler to reach the backend.

#### Scenario: Backend call happens server-side
- **WHEN** any admin screen reads or mutates data
- **THEN** the call to the backend originates from server-side code in the Next.js process, not from a `fetch` executed in the browser
