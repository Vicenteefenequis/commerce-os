import type { Role } from "./role.js";

export interface RoleAssignment {
  role: Role;
  /** Null for an org-wide (admin) assignment. */
  venueId: string | null;
}

export interface RoleAssignmentRepositoryPort {
  findRolesForUser(tenantId: string, userId: string): Promise<Role[]>;
  /**
   * All of a user's role assignments (role + Venue scope), the basis for
   * resolving Identity.venueIds (design.md D3).
   */
  findAssignmentsForUser(tenantId: string, userId: string): Promise<RoleAssignment[]>;
  create(assignment: { tenantId: string; userId: string; role: Role; venueId: string | null }): Promise<void>;
}
