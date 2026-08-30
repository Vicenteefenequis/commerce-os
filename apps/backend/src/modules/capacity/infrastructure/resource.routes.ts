import { Router } from "express";
import { txRoute } from "../../../http/tx-route.js";
import { requireAuth } from "../../../http/middleware/require-auth.js";
import { requirePermission } from "../../authorization/infrastructure/require-permission.middleware.js";
import {
  createResourceController,
  getAvailableCapacityController,
  listResourcesController,
  setResourceCapacityController,
} from "./resource.controller.js";

export const resourceRouter = Router();

resourceRouter.post(
  "/resources",
  requireAuth,
  requirePermission("resource:manage"),
  txRoute(createResourceController),
);

resourceRouter.get(
  "/resources",
  requireAuth,
  requirePermission("resource:read"),
  txRoute(listResourcesController),
);

resourceRouter.put(
  "/resources/:id/capacity",
  requireAuth,
  requirePermission("resource:manage"),
  txRoute(setResourceCapacityController),
);

resourceRouter.get(
  "/resources/:id/available-capacity",
  requireAuth,
  requirePermission("resource:read"),
  txRoute(getAvailableCapacityController),
);
