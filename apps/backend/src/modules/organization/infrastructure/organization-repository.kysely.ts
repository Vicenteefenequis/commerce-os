import type { Trx } from "../../../http/tx-route.js";
import { Organization } from "../domain/organization.entity.js";
import type { OrganizationRepositoryPort } from "../domain/ports.js";

export class KyselyOrganizationRepository implements OrganizationRepositoryPort {
  constructor(private readonly trx: Trx) {}

  async create(organization: { id: string; name: string; slug: string }): Promise<Organization> {
    const row = await this.trx
      .insertInto("organizations")
      .values({ id: organization.id, name: organization.name, slug: organization.slug })
      .returningAll()
      .executeTakeFirstOrThrow();
    return Organization.create({ id: row.id, name: row.name, slug: row.slug });
  }

  async findById(id: string): Promise<Organization | null> {
    const row = await this.trx
      .selectFrom("organizations")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? Organization.create({ id: row.id, name: row.name, slug: row.slug }) : null;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const row = await this.trx
      .selectFrom("organizations")
      .selectAll()
      .where("slug", "=", slug)
      .executeTakeFirst();
    return row ? Organization.create({ id: row.id, name: row.name, slug: row.slug }) : null;
  }
}
