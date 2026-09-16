import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import type { Database } from "../../../db/schema.js";
import type { Trx } from "../../../http/tx-route.js";
import type { RoleAssignment, RoleAssignmentRepositoryPort } from "../domain/ports.js";
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

  async findAssignmentsForUser(tenantId: string, userId: string): Promise<RoleAssignment[]> {
    const rows = await this.conn
      .selectFrom("role_assignments")
      .select(["role", "venue_id"])
      .where("tenant_id", "=", tenantId)
      .where("user_id", "=", userId)
      .execute();
    return rows.filter((row) => isRole(row.role)).map((row) => ({ role: row.role as Role, venueId: row.venue_id }));
  }

  async create(assignment: { tenantId: string; userId: string; role: Role; venueId: string | null }): Promise<void> {
    await this.conn
      .insertInto("role_assignments")
      .values({
        id: randomUUID(),
        tenant_id: assignment.tenantId,
        user_id: assignment.userId,
        role: assignment.role,
        venue_id: assignment.venueId,
      })
      .execute();
  }
}
