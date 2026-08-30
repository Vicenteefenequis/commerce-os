import type { NextFunction, Request, Response } from "express";
import { PermissionCheckUseCase } from "../application/permission-check.usecase.js";
import type { Permission } from "../domain/role.js";

const permissionCheck = new PermissionCheckUseCase();

/**
 * IAM-003 / spec: foundation/authorization - "Server-side enforcement of
 * permissions". Ownership (PRD 18.2) is enforced by Row Level Security on
 * the transaction opened for the route (design.md D4): a resource
 * belonging to another tenant simply will not be visible/matched, so this
 * middleware only needs to check identity + organization + permission.
 */
export function requirePermission(permission: Permission) {
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
    });

    if (!allowed) {
      res.status(403).json({ error: "permission denied" });
      return;
    }

    next();
  };
}
