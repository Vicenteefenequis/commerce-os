import { Router } from "express";
import { txRoute } from "../../../http/tx-route.js";
import { requireAuth } from "../../../http/middleware/require-auth.js";
import { requirePermission } from "../../authorization/infrastructure/require-permission.middleware.js";
import { getOrganizationController } from "./organization.controller.js";

export const organizationRouter = Router();

// Organization creation moved to POST /platform/organizations
// (add-platform-admin-console): it now requires an authenticated platform
// admin instead of being a public bootstrap route.

organizationRouter.get(
  "/organizations/:id",
  requireAuth,
  requirePermission("organization:read"),
  txRoute(getOrganizationController),
);
