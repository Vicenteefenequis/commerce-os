import type { Organization } from "./organization.entity.js";

export interface OrganizationRepositoryPort {
  create(organization: { id: string; name: string; slug: string }): Promise<Organization>;
  findById(id: string): Promise<Organization | null>;
  findBySlug(slug: string): Promise<Organization | null>;
  /**
   * Every Organization, unscoped (the `organizations` table carries no
   * RLS). Used by `storefront/discovery` to fan out a per-tenant,
   * RLS-scoped read over every tenant (design.md - "Discovery reads by
   * fanning out per-tenant, not with a single cross-tenant SQL query"),
   * since no single query can read more than one tenant's rows under RLS.
   */
  listAll(): Promise<Organization[]>;
}
