import { Router } from "express";
import { txRouteWithTenant } from "../../../http/tx-route.js";
import { checkoutController } from "./checkout.controller.js";

export const checkoutRouter = Router();

/**
 * Public, no requireAuth (spec: commerce/checkout - "Checkout does not
 * require account creation"). tenantId comes from an authenticated
 * identity when present (a staff-initiated sale), else from the request
 * body - same pattern as identity/login, which is also unauthenticated
 * and resolves its tenant from the body (see tx-route.ts
 * txRouteWithTenant doc comment). A wrong tenantId simply fails to
 * resolve any product/resource under RLS, the same way a wrong
 * email/password fails login.
 */
checkoutRouter.post(
  "/checkout",
  txRouteWithTenant(
    (req) => req.identity?.tenantId ?? ((req.body as { tenantId?: string })?.tenantId ?? ""),
    checkoutController,
  ),
);
