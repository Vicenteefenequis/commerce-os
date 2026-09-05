import type { Organization } from "../domain/organization.entity.js";
import type { OrganizationRepositoryPort } from "../domain/ports.js";

export class OrganizationNotFoundError extends Error {
  constructor() {
    super("organization not found");
  }
}

/**
 * spec: foundation/organization - "Organization verification is
 * platform-admin-controlled". Authorization (platform-admin only) is
 * enforced by the caller (requirePlatformAuth middleware) - this use case
 * only performs the write.
 */
export class SetOrganizationVerifiedUseCase {
  constructor(private readonly organizations: OrganizationRepositoryPort) {}

  async execute(organizationId: string, verified: boolean): Promise<Organization> {
    const updated = await this.organizations.setVerified(organizationId, verified);
    if (!updated) throw new OrganizationNotFoundError();
    return updated;
  }
}
