import { Router } from "express";
import { txRoutePublic } from "../../../http/tx-route.js";
import { requirePlatformAuth } from "../../../http/middleware/require-platform-auth.js";
import {
  createTenantWithOwnerController,
  listOrganizationsController,
  platformLoginController,
  platformLogoutController,
  setOrganizationVerifiedController,
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
  txRoutePublic(createTenantWithOwnerController),
);
platformRouter.patch(
  "/platform/organizations/:id/verified",
  requirePlatformAuth,
  txRoutePublic(setOrganizationVerifiedController),
);
