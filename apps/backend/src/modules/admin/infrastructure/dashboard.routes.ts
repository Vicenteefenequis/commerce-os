import { Router } from "express";
import { txRoute } from "../../../http/tx-route.js";
import { requireAuth } from "../../../http/middleware/require-auth.js";
import { requirePermission } from "../../authorization/infrastructure/require-permission.middleware.js";
import { getDashboardSummaryController } from "./dashboard.controller.js";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/dashboard/summary",
  requireAuth,
  requirePermission("order:manage"),
  txRoute(getDashboardSummaryController),
);
