import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Loads the repo-root `.env` directly into `process.env`, independent of
 * whatever spawned this process. Discovered necessary while testing M3
 * manually: `pnpm dev` (via Turbo, which defaults to strict env mode)
 * silently stripped unlisted vars like `STRIPE_SECRET_KEY` from the
 * backend's environment even when `.env` was correctly filled in and
 * sourced in the parent shell. Loading the file here sidesteps that -
 * and any other launcher's env-forwarding behavior - entirely. Existing
 * `process.env` values always win (matches `.env.loadEnvFile`'s default
 * of not overwriting already-set vars), so real deployment env vars
 * still take precedence over a stray `.env` file. No-ops when the file
 * doesn't exist (e.g. production, where env vars are injected directly).
 */
const rootEnvPath = path.resolve(import.meta.dirname, "../../../../.env");
if (existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required(
    "DATABASE_URL",
    "postgres://commerce_os:commerce_os@localhost:5432/commerce_os",
  ),
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? "cos_session",
  sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS ?? 60 * 60 * 24 * 7),
  /**
   * Distinct from sessionCookieName so a platform admin session and a
   * tenant admin session can coexist in the same browser without either
   * overwriting the other (add-platform-admin-console design.md).
   */
  platformSessionCookieName: process.env.PLATFORM_SESSION_COOKIE_NAME ?? "cos_platform_session",
  isProduction: (process.env.NODE_ENV ?? "development") === "production",
  /**
   * Optional, not `required()`: most of the app (and its tests) has
   * nothing to do with payments, so it must keep booting without these
   * set. `StripePaymentProvider` itself throws if it is ever
   * instantiated without them (payments/infrastructure/stripe-payment-provider.ts).
   */
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  /**
   * Transactional email (M10). Optional, same reasoning as the Stripe
   * vars above: most of the app boots fine without them, and
   * `ResendEmailProvider`/`SmtpEmailProvider` throw if instantiated
   * without their own required config.
   */
  resendApiKey: process.env.RESEND_API_KEY,
  resendFromEmail: process.env.RESEND_FROM_EMAIL,
  /**
   * SMTP is dev-only (local Mailpit or a Mailtrap sandbox) - never
   * intended for staging/prod, where Resend always takes priority when
   * both are configured (design.md - provider selection priority).
   */
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT ?? 1025),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
};
