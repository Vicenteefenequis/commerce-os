## Context

See proposal.md - Why. Building blocks that already exist and this design reuses as-is:

- `Entitlement` (status `issued` only today, docstring already flags M5 will extend it) and `Ticket` (code -> Entitlement reference) from `add-entitlement-ticket`.
- RBAC: `requirePermission(permission)` middleware + `roleHasPermission` fixed role->permission map (`authorization/domain/role.ts`), RLS-per-tenant transaction pattern for isolation (no manual tenant filtering needed in queries).
- `Order.venueId` (the Venue a purchase was made for) and `OrderLine.reservationId` (nullable; `Reservation.period` when present) as the source data for the venue/time checks - no new domain concept needed for either.
- Outbox/consumer pattern already used for `order.status_changed` -> entitlement issuance (`ticketing-outbox-consumer.ts`) as the template for any future async work, though this change's scan flow is synchronous request/response (ACS-003: fast enough to avoid visible queues), not event-driven.

## Goals / Non-Goals

**Goals:**
- A single synchronous scan endpoint that returns one of the five ACS-002 outcomes per request.
- Atomic, race-safe `issued -> consumed` transition.
- A durable record of every scan attempt (for "already used" detection and for audit).

**Non-Goals:**
- No scanner UI/PWA in this change - API only (see proposal.md - Impact).
- No offline/intermittent-connectivity support (ACS-006) - request assumes an online round-trip.
- No multi-use tickets (TKT-006) - `consumed` is terminal.
- No `User -> Venue` fixed assignment - the operator's Venue is supplied per session/request (decision below), not modeled as a new relationship.

## Decisions

**D1 - Venue is a request parameter, not an identity attribute.**
Alternatives: (a) fixed `User -> Venue` assignment checked at login; (b) Venue selected by the operator at the start of a scanning session and sent with each scan. Chose (b): operators may work across Venues in the same Organization, and no such assignment exists in the identity model today - adding one would be a Foundation-level change out of scope here. The scanning session's selected Venue is client-held state (the PWA remembers it); the backend only validates it belongs to the caller's Organization on each request, it does not persist a "current venue" per operator.

**D2 - Wrong venue does not require Resource/Reservation lookup.**
The obvious alternative was deriving "location" from the Resource behind the Reservation (mirroring how capacity is tracked). Rejected: it would make the check undefined for Entitlements whose Order line has no Reservation (free-roam products), and Resource->Venue is already a fixed, simpler fact available directly via `Order.venueId`. Venue is the correct granularity for ACS-002's "local incorreto" - a ticket sold for Venue A used at Venue B, not "which specific gate/resource".

**D3 - Wrong time and expired are only evaluated when a Reservation exists.**
Products without capacity linkage have no time-bound at all (spec: catalog/product allows a Product-level availability window, but that's a sales-time constraint, not an entry-time constraint - already enforced at checkout, not re-checked at the door). Re-deriving a time window from the Product would conflate two different concerns; Reservation.period is the one source of truth for "when this specific unit of capacity is meant to be used."

**D4 - "Expired" (ACS-002) is a distinct outcome from "wrong time", both derived from the same Reservation.period, without a new Entitlement state.**
The Entitlement itself still carries no expiry date - "expired" is not a third status alongside `issued`/`consumed`, it is a read-time classification of *why* the scan falls outside the Reservation's period: scanning before the period starts is reported as wrong time (too early - e.g. showed up for tomorrow's session), scanning after the period ends is reported as expired (too late - the window for this entry has closed). Both are computed the same way (compare `now` to `period` bounds) and neither touches the Entitlement's status; only the outcome label differs, matching ACS-002's requirement to distinguish these two cases for the operator.

**D5 - Atomicity via conditional update, not a lock table.**
`issued -> consumed` is a single conditional UPDATE (`WHERE status = 'issued'`) inside the request's transaction, mirroring `commit-capacity.usecase.ts`'s optimistic-concurrency style already used for capacity commitments. Whichever concurrent request's UPDATE affects zero rows loses and is reported as already used - no explicit row lock or queue needed for the volumes this system targets (single-venue door, not distributed high-throughput).

**D6 - Every attempt (including denials) is persisted, not just consumptions.**
A `ScanAttempt`-style record (Entitlement reference, outcome, venue, timestamp) is written regardless of outcome. This is what makes "already used" reliably answerable (the Entitlement's own status already tells us that) but is primarily for the audit trail PRD implicitly expects (§16 step 5: "sistema registra tentativa") and for future dashboard/ops visibility (M6) - not strictly required for correctness of the state machine itself.

**D7 - New permission `entitlement:consume`.**
Follows the existing `<resource>:<action>` naming (`role.ts`). Granted to `access_operator` (its sole purpose per the PRD persona), and to `owner`/`admin` for support/testing, consistent with how other manage-type permissions are distributed.

## Risks / Trade-offs

- [Risk] Venue supplied by the client on every request means a compromised/misconfigured scanner could claim the wrong Venue. -> Mitigation: the permission check already scopes to the caller's Organization; a Venue outside that Organization is rejected the same as tenant isolation elsewhere. Within-Organization Venue selection is trusted the same way channel selection is trusted at checkout - not a new trust boundary.
- [Risk] Conditional-update race loser gets "already used" even on a true first-and-only double-tap (two physical scans of the same ticket in quick succession by the same operator). -> Acceptable: this is the intended double-scan protection (ACS-005), not a bug.
- [Trade-off] No offline mode means a connectivity outage stops entry entirely for this change. -> Accepted per proposal.md and PRD ACS-006 ("estratégia futura").
