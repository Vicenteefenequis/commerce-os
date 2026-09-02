import type { Organization } from "../../organization/domain/organization.entity.js";
import type { OrganizationRepositoryPort } from "../../organization/domain/ports.js";
import type { TenantContextPort } from "../domain/ports.js";

export class TenantNotFoundError extends Error {
  constructor() {
    super("tenant not found");
  }
}

/** spec: storefront/tenant-entry - resolves the slug in the URL to the tenant, for callers that only need the tenant's own identity (not its venues). */
export class ResolveStorefrontTenantUseCase {
  constructor(
    private readonly organizations: OrganizationRepositoryPort,
    private readonly tenantContext: TenantContextPort,
  ) {}

  async execute(tenantSlug: string): Promise<Organization> {
    const tenant = await this.organizations.findBySlug(tenantSlug);
    if (!tenant) throw new TenantNotFoundError();

    await this.tenantContext.setTenantId(tenant.id);
    return tenant;
  }
}
