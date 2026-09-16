import type { Request } from "express";
import { Router } from "express";
import { txRoute } from "../../../http/tx-route.js";
import { requireAuth } from "../../../http/middleware/require-auth.js";
import { requirePermission } from "../../authorization/infrastructure/require-permission.middleware.js";
import { scanTicketController } from "./scan.controller.js";

export const accessScanRouter = Router();

function resolveScanVenueId(req: Request): string | undefined {
  return (req.body as { venueId?: string })?.venueId;
}

/**
 * spec: access/scan - "Scanning requires the entitlement:consume
 * permission" (openspec change add-venue-scoped-user-roles: now also
 * Venue-scoped - an Admin holds it for every Venue, a Validador only for
 * their assigned Venue(s)). Enforced server-side regardless of what the
 * scanner UI allows (design.md D7).
 */
accessScanRouter.post(
  "/access/scan",
  requireAuth,
  requirePermission("entitlement:consume", resolveScanVenueId),
  txRoute(scanTicketController),
);
