import { Router, type Request } from "express";
import { txRouteWithTenant } from "../../../http/tx-route.js";
import {
  getStorefrontVariantAvailabilityController,
  listStorefrontProductsController,
  listStorefrontVenuesController,
} from "./storefront.controller.js";

export const storefrontRouter = Router();

/**
 * Public, no requireAuth (spec: storefront/catalog - a consumer browses
 * before there is any account or session). tenantId comes from the URL
 * rather than an identity, mirroring the public checkout endpoint's
 * pattern (checkout.routes.ts) since there is no session to resolve it
 * from (design.md decision).
 */
function tenantIdFromParams(req: Request): string {
  return (req.params as { tenantId?: string }).tenantId ?? "";
}

storefrontRouter.get(
  "/storefront/venues/:tenantId",
  txRouteWithTenant(tenantIdFromParams, listStorefrontVenuesController),
);

storefrontRouter.get(
  "/storefront/venues/:tenantId/:venueId/products",
  txRouteWithTenant(tenantIdFromParams, listStorefrontProductsController),
);

storefrontRouter.get(
  "/storefront/variants/:tenantId/:variantId/availability",
  txRouteWithTenant(tenantIdFromParams, getStorefrontVariantAvailabilityController),
);
