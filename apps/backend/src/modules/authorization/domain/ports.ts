import type { Role } from "./role.js";

export interface RoleAssignmentRepositoryPort {
  findRolesForUser(tenantId: string, userId: string): Promise<Role[]>;
  create(assignment: { tenantId: string; userId: string; role: Role }): Promise<void>;
}
