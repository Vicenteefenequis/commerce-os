import { Router } from "express";
import { txRoute } from "../../../http/tx-route.js";
import { requireAuth } from "../../../http/middleware/require-auth.js";
import { requirePermission } from "../../authorization/infrastructure/require-permission.middleware.js";
import { cancelOrderController, getOrderController } from "./order.controller.js";

export const orderRouter = Router();

orderRouter.get("/orders/:id", requireAuth, requirePermission("order:manage"), txRoute(getOrderController));

orderRouter.post(
  "/orders/:id/cancel",
  requireAuth,
  requirePermission("order:manage"),
  txRoute(cancelOrderController),
);
