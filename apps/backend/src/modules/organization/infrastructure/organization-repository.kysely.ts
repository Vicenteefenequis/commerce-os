import { sql } from "kysely";
import type { Trx } from "../../../http/tx-route.js";
import { Organization } from "../domain/organization.entity.js";
import type { OrganizationRepositoryPort } from "../domain/ports.js";

function toDomain(row: { id: string; name: string; slug: string; verified: boolean }): Organization {
  return Organization.create({ id: row.id, name: row.name, slug: row.slug, verified: row.verified });
}

export class KyselyOrganizationRepository implements OrganizationRepositoryPort {
  constructor(private readonly trx: Trx) {}

  async create(organization: { id: string; name: string; slug: string }): Promise<Organization> {
    const row = await this.trx
      .insertInto("organizations")
      .values({ id: organization.id, name: organization.name, slug: organization.slug })
      .returningAll()
      .executeTakeFirstOrThrow();
    return toDomain(row);
  }

  async findById(id: string): Promise<Organization | null> {
    const row = await this.trx
      .selectFrom("organizations")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? toDomain(row) : null;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const row = await this.trx
      .selectFrom("organizations")
      .selectAll()
      .where("slug", "=", slug)
      .executeTakeFirst();
    return row ? toDomain(row) : null;
  }

  async listAll(): Promise<Organization[]> {
    const rows = await this.trx.selectFrom("organizations").selectAll().execute();
    return rows.map(toDomain);
  }

  async setVerified(id: string, verified: boolean): Promise<Organization | null> {
    const row = await this.trx
      .updateTable("organizations")
      .set({ verified, updated_at: sql`now()` })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();
    return row ? toDomain(row) : null;
  }
}
