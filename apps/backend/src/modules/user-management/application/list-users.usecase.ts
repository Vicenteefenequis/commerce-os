import type { UserManagementRepositoryPort, UserWithAssignments } from "../domain/ports.js";

/** spec: foundation/user-management - "Admin lists the organization's users". */
export class ListUsersUseCase {
  constructor(private readonly userManagement: UserManagementRepositoryPort) {}

  execute(tenantId: string): Promise<UserWithAssignments[]> {
    return this.userManagement.listUsersWithAssignments(tenantId);
  }
}
