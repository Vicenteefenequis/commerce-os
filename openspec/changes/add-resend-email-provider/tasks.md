## 1. Concrete email provider

- [ ] 1.1 Add `resend` as a backend dependency
- [ ] 1.2 Add `resendApiKey`/`resendFromEmail` to `apps/backend/src/config/env.ts` (optional, mirroring `stripeSecretKey`) and document `RESEND_API_KEY`/`RESEND_FROM_EMAIL` in `.env.example`
- [ ] 1.3 Implement `ResendEmailProvider` (`apps/backend/src/modules/communication/infrastructure/resend-email-provider.ts`) implementing `EmailProviderPort`: returns `{status: "not_configured"}` immediately when apiKey/fromEmail are missing (no network call); otherwise sends via Resend and maps a provider error to `{status: "failed", reason}`; verify with a unit test covering unconfigured, success, and failure, mocking the Resend client
- [ ] 1.4 Wire `ResendEmailProvider` in place of `NullEmailProvider` at `ticketing-outbox-consumer.ts:42`
- [ ] 1.5 Verify the full ticketing-lifecycle integration test still passes unmodified (env vars unset in test environment → still records `not_configured`, exactly as before)

## 2. Validation

- [ ] 2.1 Run backend test suite and confirm no regressions
- [ ] 2.2 Update `docs/ROADMAP.md`: mark M10 concluded, reference this change
