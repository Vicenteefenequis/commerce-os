import { Router } from "express";
import { stripeWebhookRoute } from "./webhook.controller.js";

export const paymentWebhookRouter = Router();

/**
 * No requireAuth - Stripe is the caller, authenticated by its signature
 * (verified inside stripeWebhookRoute), not a session (PAY-003/PAY-004).
 */
paymentWebhookRouter.post("/webhooks/stripe", stripeWebhookRoute);
