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

  constructor(secretKey: string | undefined = env.stripeSecretKey, webhookSecret: string | undefined = env.stripeWebhookSecret) {
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
