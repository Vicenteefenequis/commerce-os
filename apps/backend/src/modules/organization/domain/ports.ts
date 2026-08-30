import type { Organization } from "./organization.entity.js";

export interface OrganizationRepositoryPort {
  create(organization: { id: string; name: string }): Promise<Organization>;
  findById(id: string): Promise<Organization | null>;
}
