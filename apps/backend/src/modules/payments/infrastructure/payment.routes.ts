import { Router } from "express";
import { txRouteWithTenant, txRoute } from "../../../http/tx-route.js";
import { requireAuth } from "../../../http/middleware/require-auth.js";
import { requirePermission } from "../../authorization/infrastructure/require-permission.middleware.js";
import {
  createPaymentIntentController,
  getPaymentStatusController,
  refundPaymentController,
} from "./payment.controller.js";

export const paymentRouter = Router();

/**
 * Public, no requireAuth (matches commerce/checkout.routes.ts): the
 * payment page has no session for a guest customer. tenantId comes from
 * an authenticated identity when present, else the request body.
 */
paymentRouter.post(
  "/orders/:id/payment-intent",
  txRouteWithTenant(
    (req) => req.identity?.tenantId ?? ((req.body as { tenantId?: string })?.tenantId ?? ""),
    createPaymentIntentController,
  ),
);

/** Public, no requireAuth - status-only (design.md - Redirect vs. webhook). tenantId comes from a query param since GET has no body. */
paymentRouter.get(
  "/payments/:id/status",
  txRouteWithTenant(
    (req) => req.identity?.tenantId ?? ((req.query as { tenantId?: string })?.tenantId ?? ""),
    getPaymentStatusController,
  ),
);

paymentRouter.post(
  "/payments/:id/refund",
  requireAuth,
  requirePermission("payment:manage"),
  txRoute(refundPaymentController),
);
