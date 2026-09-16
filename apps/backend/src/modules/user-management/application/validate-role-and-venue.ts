import { ROLES, type Role } from "../../authorization/domain/role.js";

export class InvalidRoleError extends Error {}
export class InvalidRoleAssignmentError extends Error {}

/**
 * spec: foundation/user-management - "Role assignment specifies a role
 * and, when required, a Venue". Shared by `CreateRoleAssignmentUseCase`
 * and `CreateUserWithRoleAssignmentUseCase` so the rule can't drift
 * between the two entry points (design.md D7).
 */
export function validateRoleAndVenue(role: string, venueId: string | null): Role {
  if (!(ROLES as readonly string[]).includes(role)) {
    throw new InvalidRoleError(`unknown role: ${role}`);
  }
  const validRole = role as Role;

  if (validRole === "admin") {
    if (venueId !== null) {
      throw new InvalidRoleAssignmentError("an Admin assignment must not specify a Venue");
    }
  } else if (venueId === null) {
    throw new InvalidRoleAssignmentError(`a ${validRole} assignment must specify a Venue`);
  }

  return validRole;
}
