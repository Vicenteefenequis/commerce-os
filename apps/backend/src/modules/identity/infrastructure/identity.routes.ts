import { Router } from "express";
import { txRoute, txRouteWithTenant } from "../../../http/tx-route.js";
import { loginController, logoutController } from "./identity.controller.js";

export const identityRouter = Router();

identityRouter.post(
  "/auth/login",
  txRouteWithTenant((req) => (req.body as { tenantId?: string })?.tenantId ?? "", loginController),
);

identityRouter.post("/auth/logout", txRoute(logoutController));
