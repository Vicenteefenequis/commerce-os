import type { NextFunction, Request, Response } from "express";
import { PermissionCheckUseCase } from "../application/permission-check.usecase.js";
import type { Permission } from "../domain/role.js";

const permissionCheck = new PermissionCheckUseCase();

/**
 * IAM-003 / spec: foundation/authorization - "Server-side enforcement of
 * permissions". Ownership (PRD 18.2) is enforced by Row Level Security on
 * the transaction opened for the route (design.md D4), and Venue scope is
 * likewise enforced by RLS on the transaction (openspec change
 * add-venue-scoped-user-roles, design.md D3) - so this middleware only
 * needs to check identity + organization + permission.
 *
 * `resolveResourceVenueId`, when given, extracts the resource's Venue id
 * from the request (e.g. a route param or query string) so a
 * Venue-scoped caller is denied here, with a clear 403, instead of
 * merely fetching zero rows silently at the RLS layer - useful for
 * write routes (create a counter sale for a specific Venue) where "no
 * rows" isn't the right failure mode.
 */
export function requirePermission(
  permission: Permission,
  resolveResourceVenueId?: (req: Request) => string | undefined,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const identity = req.identity;
    if (!identity) {
      res.status(401).json({ error: "authentication required" });
      return;
    }

    const allowed = permissionCheck.execute({
      actingTenantId: identity.tenantId,
      roles: identity.roles,
      permission,
      callerVenueIds: identity.venueIds,
      resourceVenueId: resolveResourceVenueId?.(req),
    });

    if (!allowed) {
      res.status(403).json({ error: "permission denied" });
      return;
    }

    next();
  };
}
