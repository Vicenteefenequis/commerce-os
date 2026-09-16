import { roleHasPermission, type Permission, type Role } from "../domain/role.js";
import type { VenueScope } from "../domain/venue-scope.js";

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
  /**
   * openspec change add-venue-scoped-user-roles, design.md D3: the
   * caller's Venue scope ("all" for Admin, else the Venue ids their role
   * assignments are scoped to). Omitted entirely for permission checks
   * with no Venue-scoped caller (e.g. `user:manage`, which is always
   * org-wide) or no specific resource Venue to check against.
   */
  callerVenueIds?: VenueScope;
  /** Venue that owns the resource being acted on, when applicable. */
  resourceVenueId?: string;
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
    if (
      input.resourceVenueId !== undefined &&
      input.callerVenueIds !== undefined &&
      input.callerVenueIds !== "all" &&
      !input.callerVenueIds.includes(input.resourceVenueId)
    ) {
      // Venue-scoped caller denied a resource outside their assigned
      // Venue(s) (spec: foundation/authorization - "Permission checks
      // validate Venue scope"), independent of role/permission.
      return false;
    }
    return input.roles.some((role) => roleHasPermission(role, input.permission));
  }
}
