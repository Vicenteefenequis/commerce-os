import { ROLES, type Role } from "../../authorization/domain/role.js";
import type { VenueRepositoryPort } from "../../venue/domain/ports.js";
import type { UserManagementRepositoryPort } from "../domain/ports.js";

export class InvalidRoleError extends Error {}
export class InvalidRoleAssignmentError extends Error {}
export class UserNotFoundError extends Error {}
export class AssignmentVenueNotFoundError extends Error {}

export interface CreateRoleAssignmentInput {
  tenantId: string;
  userId: string;
  role: string;
  venueId: string | null;
}

/**
 * spec: foundation/user-management - "Only Admin can manage user role
 * assignments" (permission is enforced by requirePermission("user:manage")
 * upstream, not here), "Role assignment specifies a role and, when
 * required, a Venue".
 */
export class CreateRoleAssignmentUseCase {
  constructor(
    private readonly userManagement: UserManagementRepositoryPort,
    private readonly venues: VenueRepositoryPort,
  ) {}

  async execute(input: CreateRoleAssignmentInput): Promise<{ id: string }> {
    if (!(ROLES as readonly string[]).includes(input.role)) {
      throw new InvalidRoleError(`unknown role: ${input.role}`);
    }
    const role = input.role as Role;

    if (role === "admin") {
      if (input.venueId !== null) {
        throw new InvalidRoleAssignmentError("an Admin assignment must not specify a Venue");
      }
    } else if (input.venueId === null) {
      throw new InvalidRoleAssignmentError(`a ${role} assignment must specify a Venue`);
    }

    const userExists = await this.userManagement.userExistsInTenant(input.tenantId, input.userId);
    if (!userExists) {
      throw new UserNotFoundError("user not found in this Organization");
    }

    if (input.venueId !== null) {
      const venue = await this.venues.findById(input.tenantId, input.venueId);
      if (!venue) {
        throw new AssignmentVenueNotFoundError("Venue not found in this Organization");
      }
    }

    return this.userManagement.createAssignment({
      tenantId: input.tenantId,
      userId: input.userId,
      role,
      venueId: input.venueId,
    });
  }
}
