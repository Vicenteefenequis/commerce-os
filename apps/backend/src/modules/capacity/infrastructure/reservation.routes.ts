import { Router } from "express";
import { txRoute } from "../../../http/tx-route.js";
import { requireAuth } from "../../../http/middleware/require-auth.js";
import { requirePermission } from "../../authorization/infrastructure/require-permission.middleware.js";
import {
  cancelReservationController,
  confirmReservationController,
  consumeReservationController,
  createReservationController,
  expireReservationController,
} from "./reservation.controller.js";

export const reservationRouter = Router();

reservationRouter.post(
  "/reservations",
  requireAuth,
  requirePermission("reservation:manage"),
  txRoute(createReservationController),
);

reservationRouter.post(
  "/reservations/:id/confirm",
  requireAuth,
  requirePermission("reservation:manage"),
  txRoute(confirmReservationController),
);

reservationRouter.post(
  "/reservations/:id/expire",
  requireAuth,
  requirePermission("reservation:manage"),
  txRoute(expireReservationController),
);

reservationRouter.post(
  "/reservations/:id/cancel",
  requireAuth,
  requirePermission("reservation:manage"),
  txRoute(cancelReservationController),
);

reservationRouter.post(
  "/reservations/:id/consume",
  requireAuth,
  requirePermission("reservation:manage"),
  txRoute(consumeReservationController),
);
