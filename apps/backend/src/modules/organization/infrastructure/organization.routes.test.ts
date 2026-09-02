import { describe, expect, it } from "vitest";
import { createApp } from "../../../http/app.js";
import request from "supertest";

/**
 * spec: foundation/organization - "Unauthenticated creation attempt is
 * rejected". Creation moved to POST /platform/organizations
 * (add-platform-admin-console); the old public bootstrap route no longer
 * exists at all.
 */
describe("POST /organizations", () => {
  it("no longer exists as a public bootstrap route", async () => {
    const app = createApp();
    const res = await request(app).post("/organizations").send({ name: "Zoo" });
    expect(res.status).toBe(404);
  });
});
