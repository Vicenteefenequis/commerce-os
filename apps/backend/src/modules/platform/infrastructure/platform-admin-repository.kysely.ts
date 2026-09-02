import type { Trx } from "../../../http/tx-route.js";
import { PlatformAdmin } from "../domain/platform-admin.entity.js";
import type { PlatformAdminRepositoryPort } from "../domain/ports.js";

export class KyselyPlatformAdminRepository implements PlatformAdminRepositoryPort {
  constructor(private readonly trx: Trx) {}

  async findByEmail(email: string): Promise<PlatformAdmin | null> {
    const row = await this.trx
      .selectFrom("platform_admins")
      .selectAll()
      .where("email", "=", email)
      .executeTakeFirst();

    if (!row) return null;

    return PlatformAdmin.create({ id: row.id, email: row.email, passwordHash: row.password_hash });
  }

  async findById(id: string): Promise<PlatformAdmin | null> {
    const row = await this.trx
      .selectFrom("platform_admins")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!row) return null;

    return PlatformAdmin.create({ id: row.id, email: row.email, passwordHash: row.password_hash });
  }
}
