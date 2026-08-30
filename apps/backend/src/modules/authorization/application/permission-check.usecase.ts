import { roleHasPermission, type Permission, type Role } from "../domain/role.js";

export interface PermissionCheckInput {
  /** Tenant (organization) the acting identity belongs to. */
  actingTenantId: string;
  roles: Role[];
  permission: Permission;
  /**
   * Tenant that owns the resource being acted on, when the operation
   * targets a specific resource (PRD 18.2: identity, organization,
   * permission, and ownership must all be validated).
   */
  resourceTenantId?: string;
}

/**
 * PRD 18.2 / IAM-003: validates identity's organization membership,
 * permission, and resource ownership. Called server-side on every
 * sensitive operation - never trusted from the frontend.
 */
export class PermissionCheckUseCase {
  execute(input: PermissionCheckInput): boolean {
    if (input.resourceTenantId !== undefined && input.resourceTenantId !== input.actingTenantId) {
      // Cross-tenant access is denied regardless of role (spec: authorization
      // - "Operation on an entity outside the caller's organization is denied").
      return false;
    }
    return input.roles.some((role) => roleHasPermission(role, input.permission));
  }
}
