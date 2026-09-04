import { sql } from "kysely";
import type { Trx } from "../../../http/tx-route.js";
import { Venue } from "../domain/venue.entity.js";
import type { UpdateVenueInput, VenueRepositoryPort } from "../domain/ports.js";

interface VenueRow {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  city: string | null;
  category: string | null;
  cover_photo_url: string | null;
  published: boolean;
}

function toDomain(row: VenueRow): Venue {
  return Venue.create({
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    address: row.address,
    city: row.city,
    category: row.category,
    coverPhotoUrl: row.cover_photo_url,
    published: row.published,
  });
}

export class KyselyVenueRepository implements VenueRepositoryPort {
  constructor(private readonly trx: Trx) {}

  async create(venue: { id: string; tenantId: string; name: string; slug: string }): Promise<Venue> {
    const row = await this.trx
      .insertInto("venues")
      .values({ id: venue.id, tenant_id: venue.tenantId, name: venue.name, slug: venue.slug })
      .returningAll()
      .executeTakeFirstOrThrow();
    return toDomain(row);
  }

  async listByTenant(tenantId: string): Promise<Venue[]> {
    const rows = await this.trx
      .selectFrom("venues")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .execute();
    return rows.map(toDomain);
  }

  async findById(tenantId: string, id: string): Promise<Venue | null> {
    const row = await this.trx
      .selectFrom("venues")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? toDomain(row) : null;
  }

  async findBySlug(tenantId: string, slug: string): Promise<Venue | null> {
    const row = await this.trx
      .selectFrom("venues")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("slug", "=", slug)
      .executeTakeFirst();
    return row ? toDomain(row) : null;
  }

  async update(tenantId: string, id: string, changes: UpdateVenueInput): Promise<Venue | null> {
    const updates: Record<string, unknown> = { updated_at: sql`now()` };
    if (changes.description !== undefined) updates.description = changes.description;
    if (changes.address !== undefined) updates.address = changes.address;
    if (changes.city !== undefined) updates.city = changes.city;
    if (changes.category !== undefined) updates.category = changes.category;
    if (changes.coverPhotoUrl !== undefined) updates.cover_photo_url = changes.coverPhotoUrl;
    if (changes.published !== undefined) updates.published = changes.published;

    const row = await this.trx
      .updateTable("venues")
      .set(updates)
      .where("tenant_id", "=", tenantId)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();
    return row ? toDomain(row) : null;
  }
}
