import type { Request } from "express";
import { Router } from "express";
import { txRoute } from "../../../http/tx-route.js";
import { requireAuth } from "../../../http/middleware/require-auth.js";
import { requirePermission } from "../../authorization/infrastructure/require-permission.middleware.js";
import { createCounterSaleController } from "./counter-sale.controller.js";

export const counterSaleRouter = Router();

function resolveSaleVenueId(req: Request): string | undefined {
  return (req.body as { venueId?: string })?.venueId;
}

/**
 * spec: admin/counter-sale - "Counter sale requires an authenticated admin
 * session" (openspec change add-venue-scoped-user-roles): now requires
 * the Admin or Vendedor role, scoped to the sale's Venue for Vendedor.
 */
counterSaleRouter.post(
  "/counter-sales",
  requireAuth,
  requirePermission("counter-sale:create", resolveSaleVenueId),
  txRoute(createCounterSaleController),
);
