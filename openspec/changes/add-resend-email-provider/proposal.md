## Why

PRD §25 lists e-mail as a **P0** integration - launch-blocking, not future work. Ticket-delivery email is already implemented via `EmailProviderPort` (M4), but no real provider is wired: `NullEmailProvider` always returns `not_configured` without sending anything. A real buyer never actually receives their ticket by email, which fails the MVP's own final test (PRD §43).

## What Changes

- Add `ResendEmailProvider` implementing the existing `EmailProviderPort`, wired in place of `NullEmailProvider` at the one call site (`ticketing-outbox-consumer.ts`).
- Returns `{status: "not_configured"}` (not a throw) when `RESEND_API_KEY`/`RESEND_FROM_EMAIL` are unset, so an unconfigured deploy behaves exactly as it does today - this is additive, not a behavior change for anyone who hasn't set the env vars yet.

## Capabilities

### Modified Capabilities

- `communication/ticket-delivery`: new requirement that a concrete provider (Resend) can be configured to actually send ticket-delivery emails, while preserving today's `not_configured` behavior when it isn't.

## Impact

- Backend: new `ResendEmailProvider` in `apps/backend/src/modules/communication/infrastructure`, new `resend` npm dependency, `RESEND_API_KEY`/`RESEND_FROM_EMAIL` added to `.env.example` and `apps/backend/src/config/env.ts`; one-line swap in `ticketing-outbox-consumer.ts`.
- No other code changes - `DeliverOrderTicketsUseCase` and the `EmailProviderPort` contract are unchanged.
- Independent of the storefront and scanner work - can be implemented in any order relative to those.
- Operational, not fully solved by this change: needs a real Resend account and a verified sending domain before ticket emails actually send in production.
