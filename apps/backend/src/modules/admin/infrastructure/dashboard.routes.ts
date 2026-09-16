import { Router } from "express";
import { txRoute } from "../../../http/tx-route.js";
import { requireAuth } from "../../../http/middleware/require-auth.js";
import { requireRole } from "../../authorization/infrastructure/require-role.middleware.js";
import { getDashboardSummaryController } from "./dashboard.controller.js";

export const dashboardRouter = Router();

/**
 * spec: admin/dashboard - "Dashboard access is restricted to the Admin
 * role" (openspec change add-venue-scoped-user-roles, design.md D5): a
 * direct role check, not a Permission, since Dashboard access is Admin-only
 * by definition rather than incidental to some other permission.
 */
dashboardRouter.get(
  "/dashboard/summary",
  requireAuth,
  requireRole("admin"),
  txRoute(getDashboardSummaryController),
);
