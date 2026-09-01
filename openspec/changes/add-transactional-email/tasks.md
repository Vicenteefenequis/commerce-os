## 1. Dependencies & Config

- [x] 1.1 Add `resend`, `nodemailer`, `@types/nodemailer` (pinned exact versions) to `apps/backend/package.json` and verify `pnpm install` succeeds
- [x] 1.2 Add optional `resendApiKey`/`resendFromEmail`/`smtpHost`/`smtpPort`/`smtpUser`/`smtpPass` to `apps/backend/src/config/env.ts` (not `required()`, same pattern as `stripeSecretKey`) and verify the backend still boots with no env vars set
- [x] 1.3 Document `RESEND_API_KEY`/`RESEND_FROM_EMAIL` in `.env.example` under a "Transactional email (M10)" comment block, following the Stripe block's style; document `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS` as dev-only (defaulting to the local `mailpit` service), with a comment on swapping in Mailtrap sandbox credentials instead

## 2. ResendEmailProvider

- [x] 2.1 Implement `ResendEmailProvider` in `apps/backend/src/modules/communication/infrastructure/resend-email-provider.ts` implementing `EmailProviderPort`, constructor throwing when `apiKey`/`fromEmail` are missing (mirrors `StripePaymentProvider`)
- [x] 2.2 Implement `send()`: call the Resend SDK with `from`/`to`/`subject`/`body`, map a successful response to `{ status: "sent" }`
- [x] 2.3 Map both a thrown error and the SDK's `{ error }` result field to `{ status: "failed", reason }`, and verify with a unit test that `send()` never throws in either case
- [x] 2.4 Unit test the config-missing constructor throw, mirroring `stripe-payment-provider` test coverage if one exists (check first)

## 3. SmtpEmailProvider & local Mailpit

- [x] 3.1 Add a `mailpit` service to `docker-compose.yml` (`axllent/mailpit` image, SMTP on 1025, web UI on 8025, no volume, no `depends_on` from `backend`) and verify `docker compose up mailpit` starts and the web UI loads at `localhost:8025`
- [x] 3.2 Implement `SmtpEmailProvider` in `apps/backend/src/modules/communication/infrastructure/smtp-email-provider.ts` implementing `EmailProviderPort` via `nodemailer.createTransport`, constructor throwing when `host` is missing
- [x] 3.3 Implement `send()` mapping a successful send to `{ status: "sent" }` and any thrown/rejected error to `{ status: "failed", reason }`, never throwing; unit test both paths
- [x] 3.4 Manually verify: with `mailpit` running and `SMTP_HOST=localhost`/`SMTP_PORT=1025` set, completing a paid order locally shows the email in Mailpit's web UI (verified directly via `SmtpEmailProvider.send()` — message landed in Mailpit's API/inbox)

## 4. Wiring

- [x] 4.1 In `registerTicketingConsumers` (`ticketing-outbox-consumer.ts`), select in priority order: `ResendEmailProvider` when `env.resendApiKey && env.resendFromEmail`, else `SmtpEmailProvider` when `env.smtpHost`, else `NullEmailProvider`; verify existing `deliver-order-tickets`/outbox tests still pass unmodified (no env vars set in test env)
- [x] 4.2 Add/extend a test that, with `RESEND_API_KEY`/`RESEND_FROM_EMAIL` set (mocking the Resend SDK), asserts `registerTicketingConsumers` routes delivery through `ResendEmailProvider` and records `sent` (implemented as a unit test on the extracted, exported `selectEmailProvider()` — the wiring function itself has no existing DB-integration test harness to extend; `EmailProviderPort`'s own `sent`/`failed`/`not_configured` mapping is already covered by `deliver-order-tickets.usecase.test.ts` and the provider-level tests)
- [x] 4.3 Add a test that, with only `SMTP_HOST` set (mocking `nodemailer`), asserts `registerTicketingConsumers` routes delivery through `SmtpEmailProvider`, and that Resend still wins when both are set (same `selectEmailProvider()` unit test, see 4.2)

## 5. Verification

- [x] 5.1 Run `pnpm --filter backend test` and confirm full suite passes, including new Resend/SMTP tests (230/230 passed, including live-Postgres integration tests)
- [x] 5.2 Manually verify (with a real `RESEND_API_KEY`/`RESEND_FROM_EMAIL` in `.env`, dev/staging only) that completing a paid order sends a real email and `ticket_deliveries` records `sent` (ran the checkout→paid→ticket-issuance flow against live Postgres with real Resend credentials in `.env`; `ticket_deliveries.status = "sent"`, confirmed via the Resend API's own response, not just the local record)
- [x] 5.3 Confirm `openspec validate --strict` passes for this change before requesting archive
