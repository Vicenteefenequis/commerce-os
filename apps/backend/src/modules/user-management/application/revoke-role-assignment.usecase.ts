import type { UserManagementRepositoryPort } from "../domain/ports.js";

/**
 * spec: foundation/user-management - "Revoking a role assignment takes
 * effect immediately": deletes the row rather than soft-disabling it, so
 * the next `resolveIdentity` read (there is no cache) reflects it on the
 * very next request.
 */
export class RevokeRoleAssignmentUseCase {
  constructor(private readonly userManagement: UserManagementRepositoryPort) {}

  execute(tenantId: string, assignmentId: string): Promise<boolean> {
    return this.userManagement.revokeAssignment(tenantId, assignmentId);
  }
}
