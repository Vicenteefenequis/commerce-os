import { Router } from "express";
import { txRoute } from "../../../http/tx-route.js";
import { requireAuth } from "../../../http/middleware/require-auth.js";
import { requirePermission } from "../../authorization/infrastructure/require-permission.middleware.js";
import { scanTicketController } from "./scan.controller.js";

export const accessScanRouter = Router();

/**
 * spec: access/scan - "Scanning requires the entitlement:consume
 * permission". Enforced server-side regardless of what the scanner UI
 * allows (design.md D7).
 */
accessScanRouter.post(
  "/access/scan",
  requireAuth,
  requirePermission("entitlement:consume"),
  txRoute(scanTicketController),
);
