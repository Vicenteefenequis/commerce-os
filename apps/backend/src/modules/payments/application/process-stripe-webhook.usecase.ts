import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import type { OrderRepositoryPort } from "../../commerce/domain/ports.js";
import { TransitionOrderStatusUseCase } from "../../commerce/application/transition-order-status.usecase.js";
import { ConfirmReservationUseCase } from "../../capacity/application/confirm-reservation.usecase.js";
import type { ReservationRepositoryPort } from "../../capacity/domain/ports.js";
import type { ProviderWebhookEvent } from "../domain/ports.js";
import type { PaymentEventRepositoryPort, PaymentRepositoryPort } from "../domain/ports.js";
import { paymentFailedEvent, paymentSucceededEvent } from "../domain/events.js";

export interface ProcessStripeWebhookInput {
  tenantId: string;
  event: ProviderWebhookEvent;
  /** Resolved by the caller (the tenant's system user - see commerce/infrastructure/system-user.kysely.ts) since a webhook has no authenticated actor. */
  actorUserId: string;
}

const PAYMENT_INTENT_SUCCEEDED = "payment_intent.succeeded";
const PAYMENT_INTENT_FAILED = "payment_intent.payment_failed";

/**
 * spec: payments/payment - "Webhook processing is idempotent",
 * "Payment confirmation never relies solely on browser redirect",
 * "Successful payment transitions the Order to paid" (now also
 * "Payment confirms held reservations"). This is the ONLY code path
 * that ever transitions a Payment out of `pending` - the payment page
 * (apps/web) only ever reads status, never sets it (design.md -
 * Redirect vs. webhook).
 */
export class ProcessStripeWebhookUseCase {
  constructor(
    private readonly events: PaymentEventRepositoryPort,
    private readonly payments: PaymentRepositoryPort,
    private readonly orders: OrderRepositoryPort,
    private readonly reservations: ReservationRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(input: ProcessStripeWebhookInput): Promise<void> {
    const paymentId = input.event.metadata.paymentId ?? null;

    const claimed = await this.events.tryClaim(
      input.tenantId,
      input.event.id,
      input.event.type,
      paymentId,
    );
    if (!claimed) return;

    if (!paymentId) return;
    const payment = await this.payments.findById(input.tenantId, paymentId);
    if (!payment) return;

    if (input.event.type === PAYMENT_INTENT_SUCCEEDED) {
      if (payment.status !== "pending") return;

      await this.payments.transitionStatus(input.tenantId, payment.id, "pending", "succeeded");
      await this.payments.recordStatusHistory(
        input.tenantId,
        payment.id,
        "pending",
        "succeeded",
        payment.amountCents,
        input.actorUserId,
        `stripe_webhook:${input.event.type}`,
      );

      const transitionOrder = new TransitionOrderStatusUseCase(this.orders, this.eventPublisher);
      await transitionOrder.execute({
        tenantId: input.tenantId,
        orderId: payment.orderId,
        to: "paid",
        actorUserId: input.actorUserId,
      });

      const order = await this.orders.findById(input.tenantId, payment.orderId);
      const confirmReservation = new ConfirmReservationUseCase(this.reservations, this.eventPublisher);
      for (const line of order?.lines ?? []) {
        if (line.reservationId) {
          await confirmReservation.execute({
            tenantId: input.tenantId,
            reservationId: line.reservationId,
            actorUserId: input.actorUserId,
          });
        }
      }

      await this.eventPublisher.publish([
        paymentSucceededEvent(input.tenantId, {
          paymentId: payment.id,
          orderId: payment.orderId,
          amountCents: payment.amountCents,
          actorUserId: input.actorUserId,
        }),
      ]);
    } else if (input.event.type === PAYMENT_INTENT_FAILED) {
      if (payment.status !== "pending") return;

      await this.payments.transitionStatus(input.tenantId, payment.id, "pending", "failed");
      await this.payments.recordStatusHistory(
        input.tenantId,
        payment.id,
        "pending",
        "failed",
        payment.amountCents,
        input.actorUserId,
        `stripe_webhook:${input.event.type}`,
      );

      await this.eventPublisher.publish([
        paymentFailedEvent(input.tenantId, {
          paymentId: payment.id,
          orderId: payment.orderId,
          actorUserId: input.actorUserId,
        }),
      ]);
    }
  }
}
