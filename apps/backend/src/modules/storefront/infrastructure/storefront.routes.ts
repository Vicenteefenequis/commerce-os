import { Router } from "express";
import { txRoutePublic } from "../../../http/tx-route.js";
import {
  getStorefrontTenantController,
  getStorefrontVariantAvailabilityController,
  listStorefrontProductsController,
  listStorefrontVenuesController,
} from "./storefront.controller.js";

export const storefrontRouter = Router();

/**
 * Public, no requireAuth (spec: storefront/catalog - a consumer browses
 * before there is any account or session), keyed by slug rather than
 * tenant/venue UUID (add-storefront-tenant-landing design.md - "Storefront
 * routes re-keyed to slug"). The tenant is not known until a use case
 * resolves the slug against `organizations` inside the handler, so these
 * use `txRoutePublic` (no `app.tenant_id` set up front) instead of
 * `txRouteWithTenant` - each use case sets it itself once the tenant is
 * resolved (see `TenantContextPort`).
 */
storefrontRouter.get("/storefront/tenants/:tenantSlug", txRoutePublic(getStorefrontTenantController));

storefrontRouter.get(
  "/storefront/tenants/:tenantSlug/venues",
  txRoutePublic(listStorefrontVenuesController),
);

storefrontRouter.get(
  "/storefront/tenants/:tenantSlug/venues/:venueSlug/products",
  txRoutePublic(listStorefrontProductsController),
);

storefrontRouter.get(
  "/storefront/tenants/:tenantSlug/venues/:venueSlug/variants/:variantId/availability",
  txRoutePublic(getStorefrontVariantAvailabilityController),
);
