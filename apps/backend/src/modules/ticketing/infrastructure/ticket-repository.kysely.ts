import type { Trx } from "../../../http/tx-route.js";
import { Ticket } from "../domain/ticket.entity.js";
import type { CreateTicketInput, TicketRepositoryPort } from "../domain/ports.js";

export class KyselyTicketRepository implements TicketRepositoryPort {
  constructor(private readonly trx: Trx) {}

  async create(input: CreateTicketInput): Promise<Ticket> {
    const row = await this.trx
      .insertInto("tickets")
      .values({
        id: input.id,
        tenant_id: input.tenantId,
        entitlement_id: input.entitlementId,
        code: input.code,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return this.toDomain(row);
  }

  async findByEntitlementIds(tenantId: string, entitlementIds: string[]): Promise<Ticket[]> {
    if (entitlementIds.length === 0) return [];
    const rows = await this.trx
      .selectFrom("tickets")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("entitlement_id", "in", entitlementIds)
      .execute();
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: { id: string; tenant_id: string; entitlement_id: string; code: string }): Ticket {
    return Ticket.create({ id: row.id, tenantId: row.tenant_id, entitlementId: row.entitlement_id, code: row.code });
  }
}
