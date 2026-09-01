## Context

See proposal.md for motivation. `POST /checkout`, `POST /orders/:id/submit-for-payment`, and the payment page (`apps/web/app/pay/[orderId]`) are already public and account-less; the payment page's own doc comment already documents "no cart/browsing/checkout-form UI, only this" and expects something to sit in front of it. `add-storefront-catalog` (M7) supplies the public read endpoints this screen browses.

## Goals / Non-Goals

**Goals:**
- A consumer can go from "never heard of this venue" to "has a paid Order and is on the payment page" using only public, unauthenticated endpoints.

**Non-Goals:**
- No storefront theming/branding system, no multi-language - PRD §31 excludes deep white-label from the MVP.
- No changes to checkout/pricing/capacity logic - this is UI only, in front of `commerce/checkout`, which already exists and is fully specified.

## Decisions

- **Route is `apps/web/app/loja/[tenantId]/[venueId]`** (public, account-less, no session middleware) - `loja` (PT-BR "store") matches the rest of the admin UI's language and reads clearly as "not `/admin`" to an unauthenticated visitor. `tenantId`/`venueId` in the path mirror the pay page's existing `?tenantId=` convention.
- **Server-rendered where it reads, client-rendered where it's interactive**: product/availability browsing loads server-side (same server-loading principle `admin/data-fetching` established for `/admin`, applied here even though this isn't `/admin`); the cart + buyer-details form is the one Client Component leaf, since it holds transient state (selected items, quantities) with no server-side representation until submission.

## Risks / Trade-offs

- [Depends on `add-storefront-catalog` landing first] → sequenced explicitly in `docs/ROADMAP.md` (M7 before M8); this change cannot start implementation until M7's public endpoints exist.
