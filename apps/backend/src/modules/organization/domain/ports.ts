import type { Organization } from "./organization.entity.js";

export interface OrganizationRepositoryPort {
  create(organization: { id: string; name: string; slug: string }): Promise<Organization>;
  findById(id: string): Promise<Organization | null>;
  findBySlug(slug: string): Promise<Organization | null>;
}
