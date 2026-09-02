/**
 * Storefront routes have no identity to resolve the tenant from up front
 * (design.md - "Storefront routes re-keyed to slug"): the tenant is only
 * known once a use case resolves the slug in the URL against
 * `organizations` (not RLS-protected). Every RLS-protected query after
 * that point needs `app.tenant_id` set for the *same* transaction, so use
 * cases take this port to set it themselves, right after resolving the
 * tenant and before touching any tenant-scoped repository.
 */
export interface TenantContextPort {
  setTenantId(tenantId: string): Promise<void>;
}
