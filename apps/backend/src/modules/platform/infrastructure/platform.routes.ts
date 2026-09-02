import { Router } from "express";
import { txRoutePublic } from "../../../http/tx-route.js";
import { requirePlatformAuth } from "../../../http/middleware/require-platform-auth.js";
import { createOrganizationController } from "../../organization/infrastructure/organization.controller.js";
import {
  listOrganizationsController,
  platformLoginController,
  platformLogoutController,
} from "./platform.controller.js";

export const platformRouter = Router();

platformRouter.post("/platform/login", txRoutePublic(platformLoginController));
platformRouter.post("/platform/logout", txRoutePublic(platformLogoutController));

platformRouter.get(
  "/platform/organizations",
  requirePlatformAuth,
  txRoutePublic(listOrganizationsController),
);
platformRouter.post(
  "/platform/organizations",
  requirePlatformAuth,
  txRoutePublic(createOrganizationController),
);
