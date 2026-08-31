import { Router } from "express";
import { txRoute, txRouteWithTenant } from "../../../http/tx-route.js";
import { requireAuth } from "../../../http/middleware/require-auth.js";
import { loginController, logoutController, meController } from "./identity.controller.js";

export const identityRouter = Router();

identityRouter.post(
  "/auth/login",
  txRouteWithTenant((req) => (req.body as { tenantId?: string })?.tenantId ?? "", loginController),
);

identityRouter.post("/auth/logout", txRoute(logoutController));

identityRouter.get("/auth/me", requireAuth, txRoute(meController));
