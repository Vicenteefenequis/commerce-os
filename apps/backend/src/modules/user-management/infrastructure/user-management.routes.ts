import { Router } from "express";
import { txRoute } from "../../../http/tx-route.js";
import { requireAuth } from "../../../http/middleware/require-auth.js";
import { requirePermission } from "../../authorization/infrastructure/require-permission.middleware.js";
import {
  createRoleAssignmentController,
  listUsersController,
  revokeRoleAssignmentController,
} from "./user-management.controller.js";

export const userManagementRouter = Router();

/**
 * spec: foundation/user-management - "Only Admin can manage user role
 * assignments". `user:manage` is granted only to `admin` (design.md D6),
 * and is never Venue-scoped, so these routes need no resourceVenueId.
 */
userManagementRouter.get(
  "/users",
  requireAuth,
  requirePermission("user:manage"),
  txRoute(listUsersController),
);

userManagementRouter.post(
  "/users/role-assignments",
  requireAuth,
  requirePermission("user:manage"),
  txRoute(createRoleAssignmentController),
);

userManagementRouter.delete(
  "/users/role-assignments/:assignmentId",
  requireAuth,
  requirePermission("user:manage"),
  txRoute(revokeRoleAssignmentController),
);
