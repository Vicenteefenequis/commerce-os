import { randomUUID } from "node:crypto";
import type { Trx } from "../../../http/tx-route.js";
import { ROLES, type Role } from "../../authorization/domain/role.js";
import type { UserManagementRepositoryPort, UserWithAssignments } from "../domain/ports.js";

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export class KyselyUserManagementRepository implements UserManagementRepositoryPort {
  constructor(private readonly trx: Trx) {}

  async listUsersWithAssignments(tenantId: string): Promise<UserWithAssignments[]> {
    const users = await this.trx
      .selectFrom("users")
      .select(["id", "email"])
      .where("tenant_id", "=", tenantId)
      .execute();

    const assignments = await this.trx
      .selectFrom("role_assignments")
      .select(["id", "user_id", "role", "venue_id"])
      .where("tenant_id", "=", tenantId)
      .execute();

    const assignmentsByUserId = new Map<string, UserWithAssignments["assignments"]>();
    for (const a of assignments) {
      if (!isRole(a.role)) continue;
      const list = assignmentsByUserId.get(a.user_id) ?? [];
      list.push({ id: a.id, role: a.role, venueId: a.venue_id });
      assignmentsByUserId.set(a.user_id, list);
    }

    return users.map((u) => ({
      userId: u.id,
      email: u.email,
      assignments: assignmentsByUserId.get(u.id) ?? [],
    }));
  }

  async createAssignment(assignment: {
    tenantId: string;
    userId: string;
    role: Role;
    venueId: string | null;
  }): Promise<{ id: string }> {
    const id = randomUUID();
    await this.trx
      .insertInto("role_assignments")
      .values({
        id,
        tenant_id: assignment.tenantId,
        user_id: assignment.userId,
        role: assignment.role,
        venue_id: assignment.venueId,
      })
      .execute();
    return { id };
  }

  async revokeAssignment(tenantId: string, assignmentId: string): Promise<boolean> {
    const result = await this.trx
      .deleteFrom("role_assignments")
      .where("tenant_id", "=", tenantId)
      .where("id", "=", assignmentId)
      .executeTakeFirst();
    return Number(result.numDeletedRows) > 0;
  }

  async userExistsInTenant(tenantId: string, userId: string): Promise<boolean> {
    const row = await this.trx
      .selectFrom("users")
      .select("id")
      .where("tenant_id", "=", tenantId)
      .where("id", "=", userId)
      .executeTakeFirst();
    return row !== undefined;
  }
}
