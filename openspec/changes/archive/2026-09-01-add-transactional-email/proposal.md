## Why

PRD §25 lists e-mail as a **P0** integration — bloqueante de lançamento. Ticket delivery already exists end-to-end (`DeliverOrderTicketsUseCase`, `EmailProviderPort`, M4) but the only wired implementation is `NullEmailProvider`, which always returns `not_configured` and never actually sends anything. Without a real provider, "enviar ticket" (item 10 of the MVP Definition of Done, PRD §43) cannot pass in a real pilot.

## What Changes

- Add `ResendEmailProvider`, an `EmailProviderPort` implementation backed by the Resend API (`resend` npm package), following the same shape as `StripePaymentProvider` (payments/infrastructure) — a single concrete adapter, no multi-provider factory.
- Wire provider selection in `registerTicketingConsumers` (`ticketing-outbox-consumer.ts`): use `ResendEmailProvider` when `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are both set in `env`, otherwise fall back to `NullEmailProvider` — mirrors the existing optional-env pattern used for Stripe (`env.stripeSecretKey`/`env.stripeWebhookSecret`).
- Add `resendApiKey`/`resendFromEmail` to `apps/backend/src/config/env.ts` as optional (not `required()`), and document them in `.env.example`.
- Map Resend send failures (thrown errors, non-2xx API responses) to `EmailSendResult.failed`, never throwing out of `send()` — matches `SendEmailInput`/`EmailSendResult` contract already defined in `communication/domain/ports.ts`.
- Add `resend` as a backend dependency.
- Add `SmtpEmailProvider`, a second `EmailProviderPort` implementation (via `nodemailer`) for local development, so the ticket-delivery flow can be exercised end-to-end without spending real Resend send quota. Selected when `SMTP_HOST` is set and `RESEND_API_KEY` is not — Resend takes priority when both are configured (staging/prod always uses Resend).
- Add a `mailpit` service to `docker-compose.yml` (SMTP catcher + web UI, no real delivery, no external account needed) as the default local target for `SmtpEmailProvider`.
- Document pointing the same `SmtpEmailProvider` at a Mailtrap Email Testing sandbox (cloud SMTP credentials, not self-hosted) as an alternative to Mailpit — no separate provider or container needed, just different `SMTP_*` env values.

No changes to `EmailProviderPort`, `DeliverOrderTicketsUseCase`, or the `sent | failed | not_configured` outcome contract — this change only fills in real implementations and their selection logic.

## Capabilities

### New Capabilities

(none — this is a new implementation of an existing port, not a new capability)

### Modified Capabilities

- `communication/ticket-delivery`: adds the requirement that a configured provider (`RESEND_API_KEY`/`RESEND_FROM_EMAIL` both set) is actually used to send email, and that provider send failures are recorded as `failed` — closing the gap where `not_configured` was previously the only reachable outcome.

## Impact

- **Code**: `apps/backend/src/modules/communication/infrastructure/` (new `resend-email-provider.ts`, `smtp-email-provider.ts`), `apps/backend/src/modules/ticketing/infrastructure/ticketing-outbox-consumer.ts` (provider selection/priority), `apps/backend/src/config/env.ts`, `.env.example`, `docker-compose.yml` (new `mailpit` service).
- **Dependencies**: adds `resend` and `nodemailer` (+ `@types/nodemailer`) to `apps/backend/package.json`.
- **Operational**: still requires a real Resend account + verified sending domain in production (out of scope for this change, same posture as Pix activation in M3) — `not_configured` remains the default in any environment without the new env vars, so no existing environment breaks. Mailpit/Mailtrap are dev-only, never used in production selection logic.
- **No API/DB changes**: `TicketDeliveryRepositoryPort`/`ticket_deliveries` schema, `EmailProviderPort`, and `DeliverOrderTicketsUseCase` are unchanged.
