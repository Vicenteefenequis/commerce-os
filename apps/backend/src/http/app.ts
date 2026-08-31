import express, { type ErrorRequestHandler } from "express";
import { resolveIdentity } from "./middleware/resolve-identity.js";
import { identityRouter } from "../modules/identity/infrastructure/identity.routes.js";
import { organizationRouter } from "../modules/organization/infrastructure/organization.routes.js";
import { venueRouter } from "../modules/venue/infrastructure/venue.routes.js";
import { configurationRouter } from "../modules/configuration/infrastructure/configuration.routes.js";
import { productRouter } from "../modules/catalog/infrastructure/product.routes.js";
import { resourceRouter } from "../modules/capacity/infrastructure/resource.routes.js";
import { leadRouter } from "../modules/marketing/infrastructure/lead.routes.js";
import { reservationRouter } from "../modules/capacity/infrastructure/reservation.routes.js";
import { checkoutRouter } from "../modules/commerce/infrastructure/checkout.routes.js";
import { orderRouter } from "../modules/commerce/infrastructure/order.routes.js";
import { paymentRouter } from "../modules/payments/infrastructure/payment.routes.js";
import { paymentWebhookRouter } from "../modules/payments/infrastructure/webhook.routes.js";

export function createApp() {
  const app = express();

  // Captures the exact request bytes alongside the parsed body, so the
  // Stripe webhook route can verify its signature over the untouched
  // payload (PAY-003/PAY-004) without a separate raw-body route.
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as express.Request).rawBody = Buffer.from(buf);
      },
    }),
  );
  app.use(resolveIdentity);

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use(identityRouter);
  app.use(organizationRouter);
  app.use(venueRouter);
  app.use(configurationRouter);
  app.use(productRouter);
  app.use(resourceRouter);
  app.use(leadRouter);
  app.use(reservationRouter);
  app.use(checkoutRouter);
  app.use(orderRouter);
  app.use(paymentRouter);
  app.use(paymentWebhookRouter);

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "internal server error" });
  };
  app.use(errorHandler);

  return app;
}
