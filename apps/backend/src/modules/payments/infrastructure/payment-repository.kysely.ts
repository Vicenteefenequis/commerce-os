import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import type { Trx } from "../../../http/tx-route.js";
import { Payment } from "../domain/payment.entity.js";
import type { PaymentMethod, PaymentStatus } from "../domain/payment.entity.js";
import type { CreatePaymentInput, PaymentRepositoryPort } from "../domain/ports.js";

export class KyselyPaymentRepository implements PaymentRepositoryPort {
  constructor(private readonly trx: Trx) {}

  async create(input: CreatePaymentInput): Promise<Payment> {
    const row = await this.trx
      .insertInto("payments")
      .values({
        id: input.id,
        tenant_id: input.tenantId,
        order_id: input.orderId,
        provider: input.provider,
        provider_payment_id: input.providerPaymentId,
        method: input.method,
        status: "pending",
        amount_cents: input.amountCents,
        currency: input.currency,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return this.toDomain(row);
  }

  async findById(tenantId: string, id: string): Promise<Payment | null> {
    const row = await this.trx
      .selectFrom("payments")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? this.toDomain(row) : null;
  }

  async findActiveByOrderId(tenantId: string, orderId: string): Promise<Payment | null> {
    const row = await this.trx
      .selectFrom("payments")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("order_id", "=", orderId)
      .where("status", "in", ["pending", "succeeded"])
      .executeTakeFirst();
    return row ? this.toDomain(row) : null;
  }

  async findMostRecentByOrderId(tenantId: string, orderId: string): Promise<Payment | null> {
    const row = await this.trx
      .selectFrom("payments")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("order_id", "=", orderId)
      .where("status", "!=", "failed")
      .orderBy("created_at", "desc")
      .executeTakeFirst();
    return row ? this.toDomain(row) : null;
  }

  async transitionStatus(
    tenantId: string,
    id: string,
    from: PaymentStatus | PaymentStatus[],
    to: PaymentStatus,
    refundedAmountCents?: number,
  ): Promise<boolean> {
    const fromStatuses = Array.isArray(from) ? from : [from];
    const result = await this.trx
      .updateTable("payments")
      .set({
        status: to,
        updated_at: sql`now()`,
        ...(refundedAmountCents !== undefined ? { refunded_amount_cents: refundedAmountCents } : {}),
      })
      .where("tenant_id", "=", tenantId)
      .where("id", "=", id)
      .where("status", "in", fromStatuses)
      .executeTakeFirst();
    return Number(result.numUpdatedRows) > 0;
  }

  async recordStatusHistory(
    tenantId: string,
    paymentId: string,
    fromStatus: PaymentStatus | null,
    toStatus: PaymentStatus,
    amountCents: number,
    actorUserId: string | null,
    cause: string,
  ): Promise<void> {
    await this.trx
      .insertInto("payment_status_history")
      .values({
        id: randomUUID(),
        tenant_id: tenantId,
        payment_id: paymentId,
        from_status: fromStatus,
        to_status: toStatus,
        amount_cents: amountCents,
        actor_user_id: actorUserId,
        cause,
      })
      .execute();
  }

  private toDomain(row: {
    id: string;
    tenant_id: string;
    order_id: string;
    provider: string;
    provider_payment_id: string;
    method: string;
    status: PaymentStatus;
    amount_cents: number;
    currency: string;
    refunded_amount_cents: number;
  }): Payment {
    return Payment.create({
      id: row.id,
      tenantId: row.tenant_id,
      orderId: row.order_id,
      provider: row.provider as "stripe",
      providerPaymentId: row.provider_payment_id,
      method: row.method as PaymentMethod,
      status: row.status,
      amountCents: row.amount_cents,
      currency: row.currency,
      refundedAmountCents: row.refunded_amount_cents,
    });
  }
}
