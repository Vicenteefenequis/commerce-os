import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import type { Trx } from "../../../http/tx-route.js";
import { Order, OrderLine } from "../domain/order.entity.js";
import type { OrderStatus } from "../domain/order.entity.js";
import type { CreateOrderInput, OrderRepositoryPort } from "../domain/ports.js";

export class KyselyOrderRepository implements OrderRepositoryPort {
  constructor(private readonly trx: Trx) {}

  async create(input: CreateOrderInput): Promise<Order> {
    const row = await this.trx
      .insertInto("orders")
      .values({
        id: input.id,
        tenant_id: input.tenantId,
        venue_id: input.venueId,
        status: "draft",
        idempotency_key: input.idempotencyKey ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const lineRows = await Promise.all(
      input.lines.map((l) =>
        this.trx
          .insertInto("order_lines")
          .values({
            id: l.id,
            tenant_id: input.tenantId,
            order_id: row.id,
            variant_id: l.variantId,
            name: l.name,
            unit_price_cents: l.unitPriceCents,
            quantity: l.quantity,
            reservation_id: l.reservationId ?? null,
          })
          .returningAll()
          .executeTakeFirstOrThrow(),
      ),
    );

    return this.toDomain(row, lineRows);
  }

  async findById(tenantId: string, id: string): Promise<Order | null> {
    const row = await this.trx
      .selectFrom("orders")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("id", "=", id)
      .executeTakeFirst();
    if (!row) return null;

    const lineRows = await this.trx
      .selectFrom("order_lines")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("order_id", "=", id)
      .execute();

    return this.toDomain(row, lineRows);
  }

  async findByIdempotencyKey(tenantId: string, idempotencyKey: string): Promise<Order | null> {
    const row = await this.trx
      .selectFrom("orders")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("idempotency_key", "=", idempotencyKey)
      .executeTakeFirst();
    if (!row) return null;

    const lineRows = await this.trx
      .selectFrom("order_lines")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("order_id", "=", row.id)
      .execute();

    return this.toDomain(row, lineRows);
  }

  async findAllByTenant(tenantId: string): Promise<Order[]> {
    const rows = await this.trx
      .selectFrom("orders")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .orderBy("created_at", "desc")
      .execute();
    if (rows.length === 0) return [];

    const lineRows = await this.trx
      .selectFrom("order_lines")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where(
        "order_id",
        "in",
        rows.map((r) => r.id),
      )
      .execute();

    const linesByOrderId = new Map<string, typeof lineRows>();
    for (const l of lineRows) {
      const list = linesByOrderId.get(l.order_id) ?? [];
      list.push(l);
      linesByOrderId.set(l.order_id, list);
    }

    return rows.map((row) => this.toDomain(row, linesByOrderId.get(row.id) ?? []));
  }

  /**
   * design.md-equivalent guard (mirrors reservation-repository.kysely.ts):
   * a single guarded UPDATE is Postgres's own atomicity for the transition.
   */
  async transitionStatus(
    tenantId: string,
    id: string,
    from: OrderStatus | OrderStatus[],
    to: OrderStatus,
  ): Promise<boolean> {
    const fromStatuses = Array.isArray(from) ? from : [from];
    const result = await this.trx
      .updateTable("orders")
      .set({ status: to, updated_at: sql`now()` })
      .where("tenant_id", "=", tenantId)
      .where("id", "=", id)
      .where("status", "in", fromStatuses)
      .executeTakeFirst();
    return Number(result.numUpdatedRows) > 0;
  }

  async recordStatusHistory(
    tenantId: string,
    orderId: string,
    fromStatus: OrderStatus | null,
    toStatus: OrderStatus,
    actorUserId: string | null,
  ): Promise<void> {
    await this.trx
      .insertInto("order_status_history")
      .values({
        id: randomUUID(),
        tenant_id: tenantId,
        order_id: orderId,
        from_status: fromStatus,
        to_status: toStatus,
        actor_user_id: actorUserId,
      })
      .execute();
  }

  private toDomain(
    row: {
      id: string;
      tenant_id: string;
      venue_id: string;
      status: OrderStatus;
      idempotency_key: string | null;
    },
    lineRows: Array<{
      id: string;
      order_id: string;
      tenant_id: string;
      variant_id: string;
      name: string;
      unit_price_cents: number;
      quantity: number;
      reservation_id: string | null;
    }>,
  ): Order {
    return Order.create({
      id: row.id,
      tenantId: row.tenant_id,
      venueId: row.venue_id,
      status: row.status,
      idempotencyKey: row.idempotency_key,
      lines: lineRows.map((l) =>
        OrderLine.create({
          id: l.id,
          orderId: l.order_id,
          tenantId: l.tenant_id,
          variantId: l.variant_id,
          name: l.name,
          unitPriceCents: l.unit_price_cents,
          quantity: l.quantity,
          reservationId: l.reservation_id,
        }),
      ),
    });
  }
}
