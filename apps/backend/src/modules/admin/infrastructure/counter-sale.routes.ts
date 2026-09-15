import { Router } from "express";
import { txRoute } from "../../../http/tx-route.js";
import { requireAuth } from "../../../http/middleware/require-auth.js";
import { createCounterSaleController } from "./counter-sale.controller.js";

export const counterSaleRouter = Router();

/**
 * spec: admin/counter-sale - "Counter sale requires an authenticated admin
 * session": requireAuth only, deliberately no requirePermission - any
 * authenticated session for the Organization can record a counter sale.
 */
counterSaleRouter.post("/counter-sales", requireAuth, txRoute(createCounterSaleController));
