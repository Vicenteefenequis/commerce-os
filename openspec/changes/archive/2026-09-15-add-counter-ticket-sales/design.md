## Context

See `proposal.md` for motivation. Relevant existing behavior this design builds on without changing:
- `commerce/order`: an Order line backed by a Resource holds a `pending` Reservation; Order transition to `paid` confirms it.
- `ticketing/entitlement` / `ticketing/ticket`: Entitlements and Tickets are issued automatically whenever an Order transitions to `paid` — this is unconditional on *how* it got there (webhook vs. admin action).
- `payments/payment`: Payment is a distinct entity from Order, financial-audit-focused, already anticipating "admin action" as a valid cause for a status change (`Financial changes are audited` requirement lists "webhook event or admin action").
- `communication/ticket-delivery`: attempts to email Tickets once issued; failure/no-provider is recorded, never blocks issuance.
- `admin/data-fetching`: admin mutations go through Server Actions calling the backend directly; reads are server-side.

## Goals / Non-Goals

**Goals:**
- Let staff record a walk-up cash sale from the admin dashboard and get a printable ticket out the other end, without inventing a second Order/Entitlement/Ticket pipeline.
- Make the channel (`storefront` vs `counter`) a first-class, queryable fact on `Order`, computed once at creation, never inferred after the fact from Payment method.

**Non-Goals:**
- Card/Pix collection from the counter-sale screen (cash only this round).
- Any hardware/driver integration with a specific thermal printer model — the print view is a browser-printable page sized for one; how staff gets it out of the browser and onto paper (OS print dialog, printer set as default) is an operational detail, not this system's concern.
- Reconciling cash drawer totals against the dashboard's channel split (bookkeeping outside this system).

## Decisions

**1. Counter sale is a new admin-side capability, not a variant of `commerce/checkout`.**
`commerce/checkout` is guest-facing and hard-requires buyer email/name. Bending it to accept an authenticated admin caller with an optional buyer would mix two different trust/identity models in one capability's requirements. `admin/counter-sale` instead calls the same lower-level primitives `commerce/checkout` uses (price recalculation, capacity/Reservation, Order creation) but owns its own entry requirements. Alternative considered: add an `origin` parameter to checkout's existing endpoint — rejected because it would force every future checkout requirement to reason about "except when origin=admin."

**2. `cash` is a Payment method, not a bypass of Payment entirely.**
Recording a real `Payment{method: cash, status: succeeded}` keeps the existing audit trail (`Financial changes are audited`), the existing Order-detail-includes-payment behavior, and the existing refund lifecycle (a cash sale can later be refunded through the same Payment refund flow, marking it `refunded`, even though refunding actual cash is an operational action outside this system). Alternative considered: skip Payment and mark Order `paid` directly via an admin flag — rejected because it would create a class of paid Orders with no financial record, breaking `Order detail exposes its active payment` and any future accounting work.

**3. Placeholder Customer is one shared record per Organization, created lazily on first use.**
Reusing a single `Cliente balcão` Customer per Organization (rather than one throwaway Customer per anonymous counter sale) keeps the Customer list from filling with noise and matches how a physical box office actually works (no real identity to capture). It's created the first time an Organization runs a counter sale without buyer info, then reused. `communication/ticket-delivery` will attempt delivery to this placeholder's (absent) email and record `not_configured`/failed the same way it already handles a missing provider — no special-casing needed there.

**4. Channel lives on `Order`, not derived from `Payment.method`.**
Deriving channel from payment method (`cash` implies counter) would break the moment cash becomes available for other flows, or Pix/card is later added to counter sale (both are already flagged as plausible next steps). An explicit `Order.channel` set once at creation is the stable signal the dashboard split and any future reporting should read.

**5. Print view is a server-rendered page at receipt width, reachable from any Ticket, not gated to counter-sale Orders.**
Scoping the print capability to `counter`-channel Orders only would be an arbitrary restriction once it exists — a storefront customer who lost their phone at the door is a real case staff will hit. The view reuses the existing Ticket QR rendering (`ticketing/ticket`'s "QR image" requirement) and the same tenant-isolated read as the rest of Ticket access.

## Risks / Trade-offs

- **[Cash payments are not verifiable]** → Unlike Pix/card, nothing confirms the staff member actually collected the cash before marking the Payment `succeeded`. Mitigated by the existing audit trail (who, when) and by scoping this to any authenticated admin session per the proposal's explicit decision — reconciliation is an operational, not a system, control for this iteration.
- **[Shared placeholder Customer conflates distinct walk-ins]** → Every anonymous counter sale for an Organization points at the same Customer record, so per-customer order history is meaningless for that record. Acceptable because no real identity was ever captured; if a venue wants per-visitor tracking they can enter buyer info (which the flow still supports).
- **[Print layout drift across printer widths]** → 58mm and 80mm thermal printers have different usable widths. Mitigated by a single fluid layout (relative units, no fixed 80mm-only assumptions) validated against both at implementation time.

## Migration Plan

- `Order.channel` needs a value for every existing Order. Backfill all pre-existing Orders to `storefront` (the only channel that existed before this change) in the same migration that adds the column, so the dashboard split is correct from day one rather than showing a gap.
- No data migration needed for `Payment.method`: `cash` is purely an additive enum value.
- Rollout is additive and backward-compatible: existing storefront checkout, payment, and dashboard behavior is unchanged; the counter-sale screen and print view are net-new surfaces.
