import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import type { Database } from "../../../db/schema.js";
import type { Trx } from "../../../http/tx-route.js";
import type { RoleAssignmentRepositoryPort } from "../domain/ports.js";
import type { Role } from "../domain/role.js";
import { ROLES } from "../domain/role.js";

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export class KyselyRoleAssignmentRepository implements RoleAssignmentRepositoryPort {
  constructor(private readonly conn: Kysely<Database> | Trx) {}

  async findRolesForUser(tenantId: string, userId: string): Promise<Role[]> {
    const rows = await this.conn
      .selectFrom("role_assignments")
      .select("role")
      .where("tenant_id", "=", tenantId)
      .where("user_id", "=", userId)
      .execute();
    return rows.map((row) => row.role).filter(isRole);
  }

  async create(assignment: { tenantId: string; userId: string; role: Role }): Promise<void> {
    await this.conn
      .insertInto("role_assignments")
      .values({
        id: randomUUID(),
        tenant_id: assignment.tenantId,
        user_id: assignment.userId,
        role: assignment.role,
      })
      .execute();
  }
}
