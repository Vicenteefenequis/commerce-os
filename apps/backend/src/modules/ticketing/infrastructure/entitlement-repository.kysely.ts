import type { Trx } from "../../../http/tx-route.js";
import { Entitlement, type EntitlementStatus } from "../domain/entitlement.entity.js";
import type { CreateEntitlementInput, EntitlementRepositoryPort } from "../domain/ports.js";

export class KyselyEntitlementRepository implements EntitlementRepositoryPort {
  constructor(private readonly trx: Trx) {}

  async create(input: CreateEntitlementInput): Promise<Entitlement> {
    const row = await this.trx
      .insertInto("entitlements")
      .values({
        id: input.id,
        tenant_id: input.tenantId,
        order_id: input.orderId,
        order_line_id: input.orderLineId,
        customer_id: input.customerId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return this.toDomain(row);
  }

  async findByOrderId(tenantId: string, orderId: string): Promise<Entitlement[]> {
    const rows = await this.trx
      .selectFrom("entitlements")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("order_id", "=", orderId)
      .execute();
    return rows.map((row) => this.toDomain(row));
  }

  async findById(tenantId: string, id: string): Promise<Entitlement | null> {
    const row = await this.trx
      .selectFrom("entitlements")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? this.toDomain(row) : null;
  }

  /**
   * add-access-control design.md D5: the guarded `WHERE status = 'issued'`
   * is Postgres's own atomicity - of two concurrent scans of the same
   * Entitlement, only one UPDATE can match the predicate, so exactly one
   * caller sees `numUpdatedRows > 0` and reports `authorized`. Mirrors
   * `KyselyCapacityCommitmentRepository.markConsumed`; no advisory lock is
   * needed because the loser simply is not the first row-modifier.
   */
  async consume(tenantId: string, id: string): Promise<boolean> {
    const result = await this.trx
      .updateTable("entitlements")
      .set({ status: "consumed" })
      .where("tenant_id", "=", tenantId)
      .where("id", "=", id)
      .where("status", "=", "issued")
      .executeTakeFirst();
    return Number(result.numUpdatedRows) > 0;
  }

  private toDomain(row: {
    id: string;
    tenant_id: string;
    order_id: string;
    order_line_id: string;
    customer_id: string;
    status: EntitlementStatus;
  }): Entitlement {
    return Entitlement.create({
      id: row.id,
      tenantId: row.tenant_id,
      orderId: row.order_id,
      orderLineId: row.order_line_id,
      customerId: row.customer_id,
      status: row.status,
    });
  }
}
