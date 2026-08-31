import { Router } from "express";
import { txRoute, txRouteWithTenant } from "../../../http/tx-route.js";
import { requireAuth } from "../../../http/middleware/require-auth.js";
import { requirePermission } from "../../authorization/infrastructure/require-permission.middleware.js";
import {
  cancelOrderController,
  fulfillOrderController,
  getOrderController,
  listOrdersController,
  submitOrderForPaymentController,
} from "./order.controller.js";

export const orderRouter = Router();

orderRouter.get("/orders", requireAuth, requirePermission("order:manage"), txRoute(listOrdersController));

orderRouter.get("/orders/:id", requireAuth, requirePermission("order:manage"), txRoute(getOrderController));

/** Public, no requireAuth - account-less like checkout.routes.ts (spec: commerce/checkout - "Checkout can be submitted for payment"). */
orderRouter.post(
  "/orders/:id/submit-for-payment",
  txRouteWithTenant(
    (req) => req.identity?.tenantId ?? ((req.body as { tenantId?: string })?.tenantId ?? ""),
    submitOrderForPaymentController,
  ),
);

orderRouter.post(
  "/orders/:id/cancel",
  requireAuth,
  requirePermission("order:manage"),
  txRoute(cancelOrderController),
);

orderRouter.post(
  "/orders/:id/fulfill",
  requireAuth,
  requirePermission("order:manage"),
  txRoute(fulfillOrderController),
);
