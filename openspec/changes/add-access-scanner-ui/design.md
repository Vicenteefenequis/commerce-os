## Context

See proposal.md for motivation. `POST /access/scan` (`apps/backend/src/modules/access/infrastructure/scan.controller.ts`) is a fully-specified, authenticated endpoint: it already always responds 200 with one of six outcomes in the body (denials included), enforces `entitlement:consume` server-side, and requires an explicit `venueId` on every request. Nothing about scanning changes here - only that an authenticated screen calls it instead of `curl`.

## Goals / Non-Goals

**Goals:**
- An access operator can scan/enter a code and see one of the six outcomes without touching the API directly, fast enough for continuous flow (PRD §16: "rápido o suficiente para permitir fluxo contínuo de pessoas").

**Non-Goals:**
- No offline/PWA installability beyond a normal responsive web page - ACS-006 (intermittent connectivity) is explicitly future work per the `access/scan` capability itself.
- No change to scan outcome logic, permission checks, or the scan-attempt audit trail - all already specified and implemented.

## Decisions

- **New authenticated admin screen** (`apps/web/app/admin/scan`), following the exact list-screen-turned-tool pattern `admin/dashboard` (M6) already established: server-loads the Venue list, and the scan-and-see-result loop is the Client Component leaf (it's inherently a tight request/response cycle, not page data).
- **Camera scanning plus manual entry, same submit path**: a barcode/QR reader library feeds the same code input the manual text field writes to, so there is exactly one code path from "code obtained" to `POST /access/scan`, regardless of how the code was obtained.

## Risks / Trade-offs

- [Camera-based scanning requires browser camera permission, which can fail or be denied] → manual entry is not a fallback bolted on later, it's a first-class equal path from the start (see spec requirement), so scanning never blocks on camera access.
