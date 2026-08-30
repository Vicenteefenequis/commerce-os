import { Router } from "express";
import { txRoute, txRoutePublic } from "../../../http/tx-route.js";
import { requireAuth } from "../../../http/middleware/require-auth.js";
import { requirePermission } from "../../authorization/infrastructure/require-permission.middleware.js";
import { createOrganizationController, getOrganizationController } from "./organization.controller.js";

export const organizationRouter = Router();

// Bootstrap endpoint: creates the tenant itself, so it runs before any
// identity/tenant context exists (spec: foundation/organization - creation).
organizationRouter.post("/organizations", txRoutePublic(createOrganizationController));

organizationRouter.get(
  "/organizations/:id",
  requireAuth,
  requirePermission("organization:read"),
  txRoute(getOrganizationController),
);
