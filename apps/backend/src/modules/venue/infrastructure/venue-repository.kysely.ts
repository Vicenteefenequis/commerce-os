import type { Trx } from "../../../http/tx-route.js";
import { Venue } from "../domain/venue.entity.js";
import type { VenueRepositoryPort } from "../domain/ports.js";

export class KyselyVenueRepository implements VenueRepositoryPort {
  constructor(private readonly trx: Trx) {}

  async create(venue: { id: string; tenantId: string; name: string }): Promise<Venue> {
    const row = await this.trx
      .insertInto("venues")
      .values({ id: venue.id, tenant_id: venue.tenantId, name: venue.name })
      .returningAll()
      .executeTakeFirstOrThrow();
    return Venue.create({ id: row.id, tenantId: row.tenant_id, name: row.name });
  }

  async listByTenant(tenantId: string): Promise<Venue[]> {
    const rows = await this.trx
      .selectFrom("venues")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .execute();
    return rows.map((row) => Venue.create({ id: row.id, tenantId: row.tenant_id, name: row.name }));
  }

  async findById(tenantId: string, id: string): Promise<Venue | null> {
    const row = await this.trx
      .selectFrom("venues")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? Venue.create({ id: row.id, tenantId: row.tenant_id, name: row.name }) : null;
  }
}
