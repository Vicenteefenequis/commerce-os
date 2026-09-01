## Context

`EmailProviderPort` (`communication/domain/ports.ts`) and its only caller, `DeliverOrderTicketsUseCase`, are already final — this change adds an implementation, not new abstraction. See proposal.md - Why/What Changes. Reference implementation for the adapter pattern: `StripePaymentProvider` (`payments/infrastructure/stripe-payment-provider.ts`) — optional constructor args defaulting from `env`, throws in the constructor if required config is missing, never throws from its operational methods.

Provider selection currently happens inline at the single call site, `registerTicketingConsumers` (`ticketing/infrastructure/ticketing-outbox-consumer.ts:42`), which today hardcodes `new NullEmailProvider()`.

## Goals / Non-Goals

**Goals:**
- Real email delivery when `RESEND_API_KEY`/`RESEND_FROM_EMAIL` are configured.
- Zero behavior change in any environment that doesn't set those vars (`not_configured`, same as today).
- Match `StripePaymentProvider`'s adapter shape for consistency.

**Non-Goals:**
- HTML/rich email templates — plain text body from `buildEmailBody` is unchanged, out of scope.
- Retry/backoff on transient Resend failures — a failed attempt is recorded as `failed`; nothing currently re-drives ticket delivery, and adding a retry mechanism is a separate concern.
- Provisioning the actual Resend account/domain — operational, called out in proposal.md - Impact, same posture as Pix in M3.

## Decisions

**Provider selection lives in the outbox consumer, not in the port/adapter layer.** `registerTicketingConsumers` picks between three implementations based on env, with a fixed priority: `ResendEmailProvider` when `env.resendApiKey && env.resendFromEmail`; else `SmtpEmailProvider` when `env.smtpHost` is set; else `NullEmailProvider`. This mirrors how `env.stripeSecretKey`/`env.stripeWebhookSecret` gate Stripe usage elsewhere. Resend always wins over SMTP when both happen to be set, so a misconfigured local `.env` copied into staging/prod can't silently downgrade real delivery to a dev catcher. Alternative considered: a factory function (`createEmailProvider()`) in the communication module — rejected as unneeded indirection for a single call site (YAGNI, same rationale `stripe-payment-provider.ts` gives for not building a multi-provider factory).

**`SmtpEmailProvider` exists only to unblock local development without spending Resend send quota** (`nodemailer`, talking SMTP to whatever `SMTP_HOST`/`SMTP_PORT` point at). It is not a second production-grade provider — same `EmailProviderPort` contract, same never-throws behavior, but no delivery guarantees are assumed. Local default target is a `mailpit` service added to `docker-compose.yml` (SMTP on 1025, web UI on 8025, no auth, no external account, no real delivery — mail just lands in Mailpit's inbox). The same provider also works unmodified against a Mailtrap Email Testing sandbox by pointing `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS` at Mailtrap's cloud SMTP credentials instead of `mailpit` — Mailtrap has no self-hosted/docker offering, so it's documented as an env-var swap, not a second container.

**`ResendEmailProvider` constructor throws if instantiated without config**, matching `StripePaymentProvider`'s constructor contract (`if (!secretKey) throw ...`). This keeps the "is it configured" check in exactly one place (the outbox consumer's `if`), not duplicated inside the adapter.

**`send()` never throws** — wraps the Resend SDK call in try/catch and also checks the SDK's `{ data, error }` result shape (the Resend Node SDK returns API-level errors in a result field rather than always throwing), mapping both paths to `{ status: "failed", reason }`. This satisfies `EmailProviderPort`'s existing contract and the new spec requirement ("Provider send failures are recorded, not thrown") without changing `DeliverOrderTicketsUseCase`, which already treats any thrown error as `failed` defensively but should not need to rely on that.

**`from` address is a required env var (`RESEND_FROM_EMAIL`), not hardcoded**, since it must be a domain Resend has verified for the tenant's Resend account — that's operational config, not a code constant.

## Risks / Trade-offs

- [Resend SDK's `{data, error}` shape could change between versions] → Pin an exact version in `package.json` (matches existing `"stripe": "^22.6.0"` pattern of a real but bounded range); adapter has a unit test asserting both the throw path and the `error` field path map to `failed`.
- [Nothing retries a `failed` delivery] → Out of scope (see Non-Goals); already true today for any `failed` outcome, this change doesn't make it worse.
- [Misconfigured `RESEND_FROM_EMAIL` (unverified domain) causes every send to fail silently as `failed`, not `not_configured`] → Acceptable: it's recorded and visible via `TicketDeliveryRepositoryPort`, and the operational note in proposal.md already flags domain verification as a manual prerequisite.
- [A developer sets `SMTP_HOST` in a shared/staging `.env` by mistake, expecting Resend but silently getting Mailpit-only delivery] → Mitigated by the fixed priority (Resend wins whenever configured) plus documenting in `.env.example` that `SMTP_*` is dev-only and never intended for staging/prod.
- [`mailpit` container adds a new always-on local service] → Low cost: no persistent volume, no external dependency, opt-in (only used when `SMTP_HOST` is set); doesn't affect `docker-compose up` for anyone not touching email locally since it has no `depends_on` from `backend`.
