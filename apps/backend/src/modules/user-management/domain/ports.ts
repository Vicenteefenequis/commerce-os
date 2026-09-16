import type { Role } from "../../authorization/domain/role.js";

export interface UserWithAssignments {
  userId: string;
  email: string;
  assignments: Array<{ id: string; role: Role; venueId: string | null }>;
}

export interface UserManagementRepositoryPort {
  /** Every user in the Organization, each with their current role assignments. */
  listUsersWithAssignments(tenantId: string): Promise<UserWithAssignments[]>;
  createAssignment(assignment: {
    tenantId: string;
    userId: string;
    role: Role;
    venueId: string | null;
  }): Promise<{ id: string }>;
  /** Returns whether a row was deleted (false if the id didn't exist for this tenant). */
  revokeAssignment(tenantId: string, assignmentId: string): Promise<boolean>;
  /** True when the user belongs to this tenant (spec: assignments target an existing user in the same Organization). */
  userExistsInTenant(tenantId: string, userId: string): Promise<boolean>;
}
