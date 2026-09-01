## Context

See proposal.md for motivation. `NullEmailProvider` is wired at exactly one call site (`ticketing-outbox-consumer.ts:42`); `EmailProviderPort`/`DeliverOrderTicketsUseCase` already treat `not_configured` as a first-class outcome distinct from `failed` (`communication/ticket-delivery`'s existing spec: "Delivery without a configured provider is recorded, not crashed").

## Goals / Non-Goals

**Goals:**
- Ticket-delivery email actually sends once `RESEND_API_KEY`/`RESEND_FROM_EMAIL` are set, with zero behavior change for anyone who hasn't set them.

**Non-Goals:**
- No email templating system, no HTML design work - reuses the existing plain-text body `DeliverOrderTicketsUseCase` already builds.
- No retry/queueing beyond what already exists (delivery is attempted once, outcome recorded; unchanged).

## Decisions

- **`ResendEmailProvider` mirrors `StripePaymentProvider`'s constructor-injection shape** (`apps/backend/src/modules/payments/infrastructure/stripe-payment-provider.ts:28`) but does **not** mirror its hard-throw-when-unconfigured behavior: `communication/ticket-delivery`'s spec requires `not_configured` to be a *recorded* outcome, not an exception, because delivery must never affect Entitlement/Ticket issuance. So the constructor accepts optional `apiKey`/`fromEmail` (defaulting to `env.resendApiKey`/`env.resendFromEmail`), and `send()` returns `{status: "not_configured"}` immediately, before any network call, when either is missing.

## Risks / Trade-offs

- [`RESEND_API_KEY` unset in most environments (including this repo's `.env.example` today)] → the `not_configured` short-circuit means every existing test and the current dev/pilot setup keeps working unchanged until someone deliberately sets the env vars.
