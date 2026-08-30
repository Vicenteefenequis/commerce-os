import type { Role } from "./role.js";

export interface RoleAssignmentRepositoryPort {
  findRolesForUser(tenantId: string, userId: string): Promise<Role[]>;
}
