import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { createApp } from "../../../http/app.js";

/** spec: commerce/fulfillment - fulfillment is staff-initiated, same posture as order cancellation and payment refund. */
describe("POST /orders/:id/fulfill", () => {
  it("rejects an unauthenticated request", async () => {
    const app = createApp();
    const res = await request(app).post(`/orders/${randomUUID()}/fulfill`).send();
    expect(res.status).toBe(401);
  });
});
