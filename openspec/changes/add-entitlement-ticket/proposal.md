## Why

A `paid` Order has no way to grant or prove an entry right, and checkout captures no buyer identity to deliver anything to. This blocks the PRD milestone after M4 ("primeiro visitante entrando utilizando exclusivamente a plataforma") — there is nothing yet to scan at the door.

## What Changes

- Checkout now captures the buyer's email and name, resolving or creating a minimal Customer record scoped to the tenant. Order snapshots which Customer purchased it.
- An Order transitioning to `paid` automatically issues one Entitlement per purchased unit (quantity 1 each) — a group buying quantity 3 gets 3 independent Entitlements, not one shared-balance Entitlement.
- Each Entitlement is backed by exactly one Ticket carrying a unique code for QR issuance. The QR references the Entitlement; it is not itself an authorization rule (validated later, in M5/Access Control).
- Entitlement and Ticket issuance run as an outbox consumer reacting to the existing `order.status_changed` event, mirroring the audit-outbox-consumer pattern already in use.
- An `EmailProviderPort` abstraction is introduced (mirrors `PaymentProviderPort` in payments) to send the ticket by email once issued. **No concrete provider is wired in this change** — sending is implemented behind the port but has no working adapter configured, the same posture as Pix today (code-complete, blocked on external account setup). Provider selection (Resend recommended) and account/domain setup are an operational follow-up, not part of this change's code.

## Capabilities

### New Capabilities
- `customer/customer`: minimal buyer identity (email, name) captured at checkout, scoped per tenant, reused across orders by email.
- `ticketing/entitlement`: the purchased right of entry, issued 1:1 per unit when its Order is paid.
- `ticketing/ticket`: the usable manifestation of an Entitlement — a unique code/QR payload referencing it.
- `communication/ticket-delivery`: sends the issued Ticket(s) to the Customer's email via a swappable provider port.

### Modified Capabilities
- `commerce/checkout`: checkout now requires buyer `email`/`name` and resolves/creates the purchasing Customer as part of submitting a cart.
- `commerce/order`: an Order retains the identity of the Customer who purchased it, snapshotted at creation like its other commercial terms.

## Impact

- `POST /checkout` request shape gains a required `customer` field; `CreateOrderUseCase` resolves/creates the Customer and sets `Order.customerId`.
- New tables: `customers`, `entitlements`, `tickets` (and a minimal delivery-attempt record for `communication/ticket-delivery`).
- New outbox consumers: Entitlement/Ticket issuance on `order.status_changed` (paid), and delivery dispatch on ticket issuance.
- New port `EmailProviderPort` in a `communication` module, with no adapter wired to a real provider yet; a `provider: "none"` or explicit not-configured state is expected and must not crash issuance.
- No new env var is required to land this change; `RESEND_API_KEY` (or equivalent) is a future operational addition once a provider is chosen.
