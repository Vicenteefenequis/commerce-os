## Why

`storefront/ticket-view` today shows a Ticket's QR code with prev/next navigation once payment succeeds — functionally complete, but visually minimal. The Golden Path Tenants design (screen `04`) treats this as the last, trust-critical moment of the golden path: it repeats the tenant's identity (logo + slug), shows the ticket code as text (a fallback if the QR can't be scanned), the offer/lote/holder/validity details, and an explicit "entrada única · não reentra" (single entry, no re-entry) rule — because the product's differentiator is capacity control, the ticket itself has to restate that rule at the moment it matters most (at the door).

## What Changes

- Redesign the ticket view to match screen `04`: tenant identity chip (logo + name + slug) at the top of the ticket card, large QR, the ticket's code rendered as readable text beneath it, a details block (offer name, lote/variant name, ticket holder, validity window), and an explicit entry-rule banner reflecting the Product's actual rule (single-entry vs. re-entry-allowed, once such a rule exists — see design.md D1 for what's derived vs. hardcoded today).
- Ticket holder name displayed on each ticket is the Order's buyer name (`commerce/checkout` already captures one buyer per Order) — no per-ticket named-holder assignment is introduced.
- Keep the existing one-at-a-time navigation for multi-ticket Orders unchanged.
- Out of scope (explicit Non-Goals, see design.md): adding the ticket to a device wallet (Apple/Google Wallet `.pkpass`/JWT generation) and transferring a ticket to another person — both are real, separate scopes (wallet pass generation; ownership reassignment semantics in `ticketing/entitlement`) that this change's UI reserves space for but does not implement.

## Capabilities

### Modified Capabilities
- `storefront/ticket-view`: ticket display gains tenant identity, code-as-text, and a details/entry-rule block; existing payment-gating and navigation requirements are unchanged.

## Impact

- `apps/web`'s ticket view screen (within the payment/confirmation flow) redesigned using `apply-ingressa-design-tokens` tokens; no new route.
- No `apps/backend` change required for the fields this change actually displays (tenant name/slug, ticket code, offer/lote name, buyer name, order/reservation validity window) — all already returned by `ticketing/ticket`'s account-less listing plus the Order/Entitlement data it references.
- Depends on `apply-ingressa-design-tokens` for the tenant chip, badge, and banner components.
