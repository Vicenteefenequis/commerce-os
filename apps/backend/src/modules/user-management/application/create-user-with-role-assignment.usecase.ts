import { InvalidUserError } from "../../identity/domain/user.entity.js";
import type { PasswordHasherPort, UserRepositoryPort } from "../../identity/domain/ports.js";
import type { VenueRepositoryPort } from "../../venue/domain/ports.js";
import type { UserManagementRepositoryPort } from "../domain/ports.js";
import { validateRoleAndVenue } from "./validate-role-and-venue.js";

export { InvalidRoleError, InvalidRoleAssignmentError } from "./validate-role-and-venue.js";
export { InvalidUserError };
export class EmailAlreadyExistsError extends Error {}
export class AssignmentVenueNotFoundError extends Error {}

export interface CreateUserWithRoleAssignmentInput {
  tenantId: string;
  email: string;
  password: string;
  role: string;
  venueId: string | null;
}

/**
 * spec: foundation/user-management - "Admin creates a new user together
 * with their first role assignment" (design.md D7). Email uniqueness is
 * checked the same way `CreateOrganizationUseCase` checks slug uniqueness
 * - a lookup before insert, not a caught unique-constraint violation.
 */
export class CreateUserWithRoleAssignmentUseCase {
  constructor(
    private readonly users: UserRepositoryPort,
    private readonly userManagement: UserManagementRepositoryPort,
    private readonly venues: VenueRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(input: CreateUserWithRoleAssignmentInput): Promise<{ userId: string; assignmentId: string }> {
    const role = validateRoleAndVenue(input.role, input.venueId);

    // Validated eagerly (mirrors CreateTenantWithOwnerUseCase) so an
    // invalid email/password never reaches the insert - KyselyUserRepository
    // wraps its own row in User.create after inserting, so a validation
    // failure there would otherwise leave an orphaned row.
    if (!input.email.includes("@")) {
      throw new InvalidUserError("email must be a valid email address");
    }
    if (!input.password) {
      throw new InvalidUserError("password is required");
    }

    if (await this.users.findByTenantAndEmail(input.tenantId, input.email)) {
      throw new EmailAlreadyExistsError("a user with this email already exists in this Organization");
    }

    if (input.venueId !== null) {
      const venue = await this.venues.findById(input.tenantId, input.venueId);
      if (!venue) {
        throw new AssignmentVenueNotFoundError("Venue not found in this Organization");
      }
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = await this.users.create({ tenantId: input.tenantId, email: input.email, passwordHash });

    const assignment = await this.userManagement.createAssignment({
      tenantId: input.tenantId,
      userId: user.id,
      role,
      venueId: input.venueId,
    });

    return { userId: user.id, assignmentId: assignment.id };
  }
}
