import type { NextFunction, Request, Response } from "express";
import type { Role } from "../domain/role.js";

/**
 * openspec change add-venue-scoped-user-roles, design.md D5: a plain
 * role-identity check for gates that aren't really about a Permission
 * (e.g. Dashboard access is Admin-only by definition, not a side effect
 * of some other permission only Admin happens to hold today).
 */
export function requireRole(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const identity = req.identity;
    if (!identity) {
      res.status(401).json({ error: "authentication required" });
      return;
    }
    if (!identity.roles.some((role) => allowed.includes(role))) {
      res.status(403).json({ error: "permission denied" });
      return;
    }
    next();
  };
}
