import express, { type ErrorRequestHandler } from "express";
import { resolveIdentity } from "./middleware/resolve-identity.js";
import { identityRouter } from "../modules/identity/infrastructure/identity.routes.js";
import { organizationRouter } from "../modules/organization/infrastructure/organization.routes.js";
import { venueRouter } from "../modules/venue/infrastructure/venue.routes.js";
import { configurationRouter } from "../modules/configuration/infrastructure/configuration.routes.js";
import { productRouter } from "../modules/catalog/infrastructure/product.routes.js";
import { resourceRouter } from "../modules/capacity/infrastructure/resource.routes.js";

export function createApp() {
  const app = express();

  app.use(express.json());
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

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "internal server error" });
  };
  app.use(errorHandler);

  return app;
}
