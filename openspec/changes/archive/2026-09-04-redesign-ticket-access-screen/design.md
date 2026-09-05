## Context

`storefront/ticket-view` specifies gating (payment must have succeeded) and navigation (one ticket at a time, prev/next) but not what display context accompanies a Ticket. `ticketing/ticket`'s account-less listing returns "every Ticket issued for that Order's Entitlements" without specifying which fields beyond the code/QR. The design's screen `04` needs: tenant name+slug, the offer name, the lote/variant name, the buyer's name as holder, and a validity window — none of which the current spec guarantees are returned together. See `openspec/specs/storefront/ticket-view`, `ticketing/ticket`, `access/scan`, `commerce/checkout` for current behavior.

## Goals / Non-Goals

**Goals:**
- Redesign the ticket view UI to match the design: tenant chip, large QR, code-as-text, details block, entry-rule banner.
- Specify exactly what display context the account-less ticket listing must include so the UI has everything it needs in one call (no separate per-ticket lookups).

**Non-Goals:**
- Wallet pass generation (Apple Wallet `.pkpass` / Google Wallet JWT) — a real integration with its own signing/certificate concerns, sized as its own future change.
- Ticket transfer to another person — requires deciding what "transfer" means for `ticketing/entitlement` (does the original buyer lose access? is a new Ticket issued? is this audited like other tenant-scoped mutations?) — real product and security decisions outside this change's scope. The UI shows a disabled or "em breve" affordance in the transfer's visual slot, not a working feature.
- A configurable "does this ticket allow re-entry" rule — no such flag exists on `catalog/product` or `capacity/resource` today. The banner is shown only for the case the system already models unambiguously: a ticket whose Entitlement's Reservation has a bounded period is a single-window entry, described as "válido de X até Y"; a generic "entrada única, não reentra" claim (implying the system enforces no re-entry) is not made unless a re-entry rule actually exists to back it — see D1.

## Decisions

### D1: The entry-rule banner describes the validity window, not an unimplemented re-entry policy
The design's mockup text ("ENTRADA ÚNICA · NÃO REENTRA") asserts a policy this system doesn't currently enforce anywhere (`access/scan` consumes the Entitlement on first successful scan, which does prevent a second *use* of the same ticket — but a second, different ticket for the same buyer/date is unaffected, and there's no product-level "re-entry allowed" flag to contrast against). This change's banner states what is true and enforced: the ticket's validity window (when the Entitlement's Order line has a Reservation) and, always, "this ticket is consumed on first scan" — phrased to match `access/scan`'s actual behavior rather than implying a broader policy.

### D2: Ticket display context is added to the account-less ticket listing, not fetched separately
Rather than the UI making N additional calls (tenant lookup, product lookup, buyer lookup) per ticket, `ticketing/ticket`'s existing account-less listing endpoint is extended to include, per Ticket: the owning Organization's name and slug, the offer (Product) name, the lote (variant) name, the Order's buyer name, and the Entitlement's Reservation validity window when one exists. This is additive to the existing response shape.

### D3: Wallet-add and transfer render as visually reserved, functionally inert affordances
Matches the design's layout (both actions are present) without claiming functionality that doesn't exist — an inert button with a "em breve" (coming soon) state is clearer to a consumer than a missing element that looks like an oversight, and clearer to future implementers than silently dropping the design's slots.

## Risks / Trade-offs

- [Risk] Deviating from the mockup's exact copy ("não reentra") could read as a smaller product claim than intended → Mitigation: an accurate claim beats a false one at the exact moment (door entry) where being wrong has real consequences (a legitimate second ticket holder being told the system claims something untrue); documented here so it's a deliberate, revisitable call once a real re-entry policy exists.
- [Risk] Extending the ticket listing response (D2) is a public, account-less endpoint — care is needed not to leak more than intended (e.g. no buyer email, no other tenant data) → Mitigation: the added fields are exactly the ones already shown elsewhere in the storefront to the same accountless buyer (organization name/slug are public per `storefront/discovery`; buyer name is what the buyer themselves entered at checkout).
