import { readFileSync } from "node:fs";
import Stripe from "stripe";
import { env } from "../../../config/env.js";
import { InvalidWebhookSignatureError } from "../application/payment-errors.js";
import type {
  CreateIntentInput,
  CreateIntentResult,
  PaymentProviderPort,
  ProviderWebhookEvent,
  RefundInput,
  RefundResult,
} from "../domain/ports.js";

/**
 * Dev-only: `stripe listen` (the `stripe-cli` docker-compose service)
 * mints a fresh ephemeral webhook signing secret every time it
 * restarts, so a static STRIPE_WEBHOOK_SECRET in .env goes stale
 * whenever that container restarts. When STRIPE_WEBHOOK_SECRET_FILE is
 * set, re-read it on every request instead of trusting the value `env`
 * captured once at process boot. Falls back to env.stripeWebhookSecret
 * if the file isn't there yet (e.g. sidecar still starting) or the var
 * isn't set at all (production, where the secret really is static).
 */
function resolveWebhookSecret(): string | undefined {
  const filePath = process.env.STRIPE_WEBHOOK_SECRET_FILE;
  if (filePath) {
    try {
      const fromFile = readFileSync(filePath, "utf8").trim();
      if (fromFile) return fromFile;
    } catch {
      // File not written yet - fall through to the static env value.
    }
  }
  return env.stripeWebhookSecret;
}

const STRIPE_PAYMENT_METHOD_TYPES: Record<CreateIntentInput["method"], string[]> = {
  card: ["card"],
  pix: ["pix"],
};

/**
 * spec: payments/payment - "Payment Provider abstraction", "Supported
 * payment methods". design.md: Stripe is the only implementation of
 * `PaymentProviderPort` - no multi-provider factory (YAGNI until a
 * second provider is actually needed).
 */
export class StripePaymentProvider implements PaymentProviderPort {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(secretKey: string | undefined = env.stripeSecretKey, webhookSecret: string | undefined = resolveWebhookSecret()) {
    if (!secretKey) throw new Error("Missing required environment variable: STRIPE_SECRET_KEY");
    if (!webhookSecret) throw new Error("Missing required environment variable: STRIPE_WEBHOOK_SECRET");
    this.stripe = new Stripe(secretKey);
    this.webhookSecret = webhookSecret;
  }

  async createIntent(input: CreateIntentInput): Promise<CreateIntentResult> {
    const intent = await this.stripe.paymentIntents.create({
      amount: input.amountCents,
      currency: input.currency,
      payment_method_types: STRIPE_PAYMENT_METHOD_TYPES[input.method],
      metadata: {
        tenantId: input.tenantId,
        orderId: input.orderId,
        paymentId: input.paymentId,
      },
    });
    if (!intent.client_secret) {
      throw new Error("Stripe did not return a client_secret for the created PaymentIntent");
    }
    return { providerPaymentId: intent.id, clientSecret: intent.client_secret };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const refund = await this.stripe.refunds.create({
      payment_intent: input.providerPaymentId,
      amount: input.amountCents,
    });
    return { providerRefundId: refund.id };
  }

  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string): ProviderWebhookEvent {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signatureHeader, this.webhookSecret);
    } catch {
      throw new InvalidWebhookSignatureError();
    }

    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    return {
      id: event.id,
      type: event.type,
      paymentIntentId: paymentIntent.id,
      metadata: paymentIntent.metadata ?? {},
    };
  }
}
