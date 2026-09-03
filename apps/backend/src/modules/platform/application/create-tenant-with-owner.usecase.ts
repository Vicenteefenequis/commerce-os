import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import {
  CreateOrganizationUseCase,
  InvalidSlugError,
  SlugAlreadyExistsError,
} from "../../organization/application/create-organization.usecase.js";
import type { OrganizationRepositoryPort } from "../../organization/domain/ports.js";
import type { Organization } from "../../organization/domain/organization.entity.js";
import { InvalidOrganizationError } from "../../organization/domain/organization.entity.js";
import type { PasswordHasherPort, UserRepositoryPort } from "../../identity/domain/ports.js";
import { InvalidUserError, type User } from "../../identity/domain/user.entity.js";
import type { RoleAssignmentRepositoryPort } from "../../authorization/domain/ports.js";
import type { TenantContextPort } from "../domain/ports.js";

export { InvalidOrganizationError, InvalidSlugError, SlugAlreadyExistsError, InvalidUserError };

export interface CreateTenantWithOwnerInput {
  name: string;
  slug?: string;
  email: string;
  password: string;
}

export interface CreateTenantWithOwnerResult {
  organization: Organization;
  owner: User;
}

/**
 * spec: foundation/platform-admin - "Register a tenant as platform admin".
 * Creates the Organization, its first User, and that user's `owner`
 * role_assignment together. Relies entirely on the caller running this
 * inside a single database transaction (see platform.controller.ts) for
 * atomicity - a thrown error here leaves nothing committed.
 */
export class CreateTenantWithOwnerUseCase {
  constructor(
    private readonly organizations: OrganizationRepositoryPort,
    private readonly users: UserRepositoryPort,
    private readonly roleAssignments: RoleAssignmentRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly tenantContext: TenantContextPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(input: CreateTenantWithOwnerInput): Promise<CreateTenantWithOwnerResult> {
    // Validated eagerly, mirroring how CreateOrganizationUseCase pre-validates
    // name/slug (see InvalidOrganizationError checks there): nothing may be
    // written to the transaction yet when this throws, so the caller's
    // catch-and-return-4xx (see platform.controller.ts) never has to roll
    // back a partially created Organization (spec: "Creation fails
    // atomically if the first user cannot be created").
    if (!input.email.includes("@")) {
      throw new InvalidUserError("email must be a valid email address");
    }
    if (!input.password) {
      throw new InvalidUserError("password is required");
    }

    const organization = await new CreateOrganizationUseCase(
      this.organizations,
      this.eventPublisher,
    ).execute({ name: input.name, slug: input.slug });

    // users/role_assignments are RLS-protected on tenant_id; the tenant did
    // not exist until the line above, so app.tenant_id could not have been
    // set by the route wrapper (see tx-route.ts txRoutePublic).
    await this.tenantContext.setTenantId(organization.id);

    const passwordHash = await this.passwordHasher.hash(input.password);
    const owner = await this.users.create({
      tenantId: organization.id,
      email: input.email,
      passwordHash,
    });

    await this.roleAssignments.create({
      tenantId: organization.id,
      userId: owner.id,
      role: "owner",
    });

    return { organization, owner };
  }
}
