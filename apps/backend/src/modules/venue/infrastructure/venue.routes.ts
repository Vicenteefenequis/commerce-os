import { Router } from "express";
import { txRoute } from "../../../http/tx-route.js";
import { requireAuth } from "../../../http/middleware/require-auth.js";
import { requirePermission } from "../../authorization/infrastructure/require-permission.middleware.js";
import { createVenueController, listVenuesController } from "./venue.controller.js";

export const venueRouter = Router();

venueRouter.post(
  "/venues",
  requireAuth,
  requirePermission("venue:manage"),
  txRoute(createVenueController),
);

venueRouter.get(
  "/venues",
  requireAuth,
  requirePermission("venue:read"),
  txRoute(listVenuesController),
);
