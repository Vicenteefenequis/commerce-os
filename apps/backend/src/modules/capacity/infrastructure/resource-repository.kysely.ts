import { sql } from "kysely";
import type { Trx } from "../../../http/tx-route.js";
import { Resource } from "../domain/resource.entity.js";
import type { CreateResourceInput, ResourceRepositoryPort } from "../domain/ports.js";

export class KyselyResourceRepository implements ResourceRepositoryPort {
  constructor(private readonly trx: Trx) {}

  async create(input: CreateResourceInput): Promise<Resource> {
    const row = await this.trx
      .insertInto("resources")
      .values({
        id: input.id,
        tenant_id: input.tenantId,
        venue_id: input.venueId,
        name: input.name,
        default_capacity: input.defaultCapacity,
        hard_capacity: input.hardCapacity ?? false,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return this.toDomain(row);
  }

  async findById(tenantId: string, id: string): Promise<Resource | null> {
    const row = await this.trx
      .selectFrom("resources")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? this.toDomain(row) : null;
  }

  async listByVenue(tenantId: string, venueId: string): Promise<Resource[]> {
    const rows = await this.trx
      .selectFrom("resources")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("venue_id", "=", venueId)
      .execute();
    return rows.map((row) => this.toDomain(row));
  }

  async setDefaultCapacity(tenantId: string, id: string, capacity: number): Promise<void> {
    await this.trx
      .updateTable("resources")
      .set({ default_capacity: capacity, updated_at: sql`now()` })
      .where("tenant_id", "=", tenantId)
      .where("id", "=", id)
      .execute();
  }

  private toDomain(row: {
    id: string;
    tenant_id: string;
    venue_id: string;
    name: string;
    default_capacity: number;
    hard_capacity: boolean;
  }): Resource {
    return Resource.create({
      id: row.id,
      tenantId: row.tenant_id,
      venueId: row.venue_id,
      name: row.name,
      defaultCapacity: row.default_capacity,
      hardCapacity: row.hard_capacity,
    });
  }
}
