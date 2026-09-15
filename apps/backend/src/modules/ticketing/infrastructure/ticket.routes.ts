import { Router } from "express";
import { txRoute, txRouteWithTenant } from "../../../http/tx-route.js";
import { requireAuth } from "../../../http/middleware/require-auth.js";
import { getTicketPrintController, getTicketQrCodeController, listOrderTicketsController } from "./ticket.controller.js";

export const ticketRouter = Router();

/**
 * spec: ticketing/ticket-print. Authenticated - registered before the
 * public `/tickets/:ticketId/qrcode` route below only for readability;
 * Express matches `/tickets/:ticketId/print` on its own literal segment
 * regardless of order.
 */
ticketRouter.get("/tickets/:ticketId/print", requireAuth, txRoute(getTicketPrintController));

/**
 * Public, no requireAuth (spec: ticketing/ticket - "Tickets for a paid
 * Order can be listed account-less"), same pattern as
 * commerce/checkout.routes.ts and payment.routes.ts: tenantId comes
 * from an authenticated identity when present, else the query string
 * (GET has no body).
 */
ticketRouter.get(
  "/orders/:orderId/tickets",
  txRouteWithTenant(
    (req) => req.identity?.tenantId ?? ((req.query as { tenantId?: string })?.tenantId ?? ""),
    listOrderTicketsController,
  ),
);

ticketRouter.get(
  "/tickets/:ticketId/qrcode",
  txRouteWithTenant(
    (req) => req.identity?.tenantId ?? ((req.query as { tenantId?: string })?.tenantId ?? ""),
    getTicketQrCodeController,
  ),
);
