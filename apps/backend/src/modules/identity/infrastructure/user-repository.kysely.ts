import type { Trx } from "../../../http/tx-route.js";
import { User } from "../domain/user.entity.js";
import type { UserRepositoryPort } from "../domain/ports.js";

export class KyselyUserRepository implements UserRepositoryPort {
  constructor(private readonly trx: Trx) {}

  async findByTenantAndEmail(tenantId: string, email: string): Promise<User | null> {
    const row = await this.trx
      .selectFrom("users")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("email", "=", email)
      .executeTakeFirst();

    if (!row) return null;

    return User.create({
      id: row.id,
      tenantId: row.tenant_id,
      email: row.email,
      passwordHash: row.password_hash,
    });
  }
}
