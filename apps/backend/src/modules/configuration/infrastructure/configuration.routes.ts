import { Router } from "express";
import { txRoute } from "../../../http/tx-route.js";
import { requireAuth } from "../../../http/middleware/require-auth.js";
import { requirePermission } from "../../authorization/infrastructure/require-permission.middleware.js";
import { getConfigurationController, setConfigurationController } from "./configuration.controller.js";

export const configurationRouter = Router();

configurationRouter.get(
  "/configuration/:key",
  requireAuth,
  requirePermission("configuration:read"),
  txRoute(getConfigurationController),
);

configurationRouter.put(
  "/configuration/:key",
  requireAuth,
  requirePermission("configuration:manage"),
  txRoute(setConfigurationController),
);
