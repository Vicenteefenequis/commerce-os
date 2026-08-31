import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { Entitlement, InvalidEntitlementError } from "./entitlement.entity.js";

function buildEntitlement(status: "issued" | "consumed" = "issued"): Entitlement {
  return Entitlement.create({
    id: randomUUID(),
    tenantId: randomUUID(),
    orderId: randomUUID(),
    orderLineId: randomUUID(),
    customerId: randomUUID(),
    status,
  });
}

describe("Entitlement", () => {
  it("transitions an issued Entitlement to consumed", () => {
    const entitlement = buildEntitlement("issued");

    const consumed = entitlement.consume();

    expect(consumed.status).toBe("consumed");
    expect(consumed.isConsumed).toBe(true);
    expect(consumed.id).toBe(entitlement.id);
  });

  it("leaves the original instance untouched when consumed", () => {
    const entitlement = buildEntitlement("issued");

    entitlement.consume();

    expect(entitlement.status).toBe("issued");
  });

  it("rejects consuming an already-consumed Entitlement (spec: ticketing/entitlement - Consumed Entitlement rejects further scans)", () => {
    const entitlement = buildEntitlement("consumed");

    expect(() => entitlement.consume()).toThrow(InvalidEntitlementError);
    expect(entitlement.status).toBe("consumed");
  });
});
