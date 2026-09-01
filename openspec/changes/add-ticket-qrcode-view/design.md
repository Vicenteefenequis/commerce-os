## Context

See proposal.md for motivation. Relevant current state:

- `Ticket.code` (`ticket.entity.ts`) is already a 72-bit `randomBytes(9).toString("base64url")` string, unique and DB-indexed — it needs no change to serve as a QR payload.
- No HTTP route today returns Entitlements/Tickets for an Order; `access/scan` only consumes a code (write path).
- The account-less precedent across `commerce/checkout`, `payments`, and `storefront` routes is: no `requireAuth`, tenant id resolved from the request (query/body/URL), resource id from the URL param, and RLS as the actual isolation boundary — no signed-token scheme exists anywhere in this codebase.
- `deliver-order-tickets.usecase.ts` already has every issued Ticket's code in memory at the moment it calls the email provider; no extra query is needed there.
- Neither app has a QR-generation library; `apps/web` already has `qr-scanner` (decode-only, used by `/admin/scan`).

## Goals / Non-Goals

**Goals:**
- Let the purchasing consumer see a scannable QR for each of their Tickets, both in the delivery email and on `/pay/[orderId]` right after payment succeeds.
- Reuse the existing account-less authorization pattern (tenantId + orderId in the request) instead of introducing a new token scheme.
- Keep QR rendering decoupled from `ticketing/entitlement` and `access/scan` — those keep working against the same Ticket code, unchanged.

**Non-Goals:**
- No persistent "recover my ticket later" link or page — confirmed out of scope for this change.
- No customer accounts or login.
- No change to how `access/scan` decodes or validates a code — it already accepts camera or manual input of the same string a QR would carry.

## Decisions

**QR generation runs server-side, in the backend.** The client only ever receives image bytes (PNG) it renders in an `<img>`. This matches the confirmed decision and keeps `Ticket.code` itself opaque to the browser until it's needed for scanning — no client-side QR-generation dependency is added to `apps/web`.
- Alternative considered: client-side generation from the code (e.g., a JS QR-encoder library rendering to canvas/SVG on both the email — impossible, email clients don't run JS — and the web page). Rejected because it would require two different rendering paths (email vs. browser) instead of one shared image source, and email clients can't execute the encoder anyway.

**New read surface: `GET /orders/:orderId/tickets` (tenantId via query, mirroring `payments`/`checkout`), returning each Ticket's id, code, and a QR image URL/endpoint.** A second endpoint serves the actual QR image bytes per Ticket (e.g. `GET /tickets/:ticketId/qrcode`), so the list response stays small and the `<img src>` on the storefront page points straight at it.
- Both endpoints follow the existing pattern: no `requireAuth`, tenantId + id from the request, RLS enforces isolation. Wrong tenantId or an unpaid/nonexistent Order resolves to an empty list / 404, never a distinct "forbidden" signal — consistent with how `commerce/checkout` and `storefront` already behave for account-less reads.
- Alternative considered: embed the QR image as a base64 data URI directly in the tickets-list response. Rejected — it inflates the list payload for every navigation step even though only one Ticket is shown at a time, and prevents the browser from caching the image independently.
- Implementation note: the "Tickets for an Order" read composes the existing `EntitlementRepositoryPort.findByOrderId` and `TicketRepositoryPort.findByEntitlementIds` methods rather than a new raw SQL join — Entitlements are only issued once an Order reaches `paid`, so an unpaid or nonexistent Order naturally yields no Entitlements and therefore no Tickets, with no separate status check needed.

**QR library: add `qrcode` (server-side PNG/SVG generation) to `apps/backend`.** It's the standard, actively maintained choice for Node-side QR rendering and needs no native bindings.

**Data join for "Tickets by Order":** query Ticket ⨝ Entitlement on `entitlementId`, filtering Entitlement by `orderId` (and tenantId). No schema change — the join keys already exist on `Entitlement` (`orderId`) and `Ticket` (`entitlementId`).

**Storefront navigation is client-side state, not per-ticket routes.** `/pay/[orderId]` fetches the full Tickets list once (codes + ids, not images) after detecting `succeeded`, keeps an index in local component state, and swaps the visible Ticket's QR `<img src>` on previous/next — no new URL/route per Ticket, no server round-trip to change which Ticket is shown.

**The two new backend reads are proxied through `apps/web`'s `/api/*` route handlers, not fetched via a Server Action or a page Server Component.** The whole `/pay/[orderId]` flow is already client-driven (Stripe Elements requires client JS, and payment status is polled client-side through the existing `/api/payments/[id]/status` route) — the Tickets list and the QR image are needed by that same client-side flow once payment resolves to `succeeded`, and an `<img src>` is a browser-native request the React tree doesn't mediate at all. Both are the same class of exception the payment-status route already establishes, not a new pattern.

**Email delivery depends on QR rendering through a port**, `QrCodeRendererPort` (declared in `communication/domain/ports.ts`, mirroring `EmailProviderPort`), implemented by a small adapter in `communication/infrastructure` that calls the ticketing module's `renderTicketQrCodePng`. This keeps `DeliverOrderTicketsUseCase` unit-testable with a fake renderer (needed to test the per-ticket failure fallback) while still reusing one QR-rendering implementation for both the email and the HTTP image route.

## Risks / Trade-offs

- **QR image endpoint is unauthenticated by design** (same as every other account-less storefront/payment route) → its only protection is that `ticketId` is an unguessable UUID and the list response (gated by orderId+tenantId) is the only place it's discoverable. This mirrors existing risk already accepted for `commerce/checkout`/`payments` routes, not a new exposure model.
- **No recovery link** means a consumer who closes the tab before the Tickets render and whose email fails or is missed has no way back to the QR through this change → accepted as explicitly out of scope per the confirmed decision; email remains the fallback channel.
- **QR rendering failure in the email path** could otherwise block delivery of an already-issued, otherwise-valid Ticket → mitigated by the added requirement that a QR rendering failure degrades to code-as-text for that one Ticket rather than failing the whole delivery.

## Migration Plan

Additive only: new route, new usecase/query, new dependency, and an extension to the existing email body. No existing data, route, or Entitlement/Ticket/Order behavior changes, so no migration or rollback beyond a normal deploy/revert of the new code paths.
