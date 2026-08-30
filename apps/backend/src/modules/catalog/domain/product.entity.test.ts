import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { InvalidProductError, Product, ProductVariant } from "./product.entity.js";

describe("ProductVariant", () => {
  const tenantId = randomUUID();

  it("requires a name", () => {
    expect(() =>
      ProductVariant.create({ id: randomUUID(), productId: randomUUID(), tenantId, name: "", priceCents: 100 }),
    ).toThrow(InvalidProductError);
  });

  it("requires a non-negative integer price", () => {
    expect(() =>
      ProductVariant.create({
        id: randomUUID(),
        productId: randomUUID(),
        tenantId,
        name: "Adult",
        priceCents: -1,
      }),
    ).toThrow(InvalidProductError);
  });
});

describe("Product", () => {
  const tenantId = randomUUID();
  const venueId = randomUUID();

  function variant(priceCents = 1000) {
    return ProductVariant.create({
      id: randomUUID(),
      productId: randomUUID(),
      tenantId,
      name: "Adult",
      priceCents,
    });
  }

  it("requires a name", () => {
    expect(() =>
      Product.create({ id: randomUUID(), tenantId, venueId, name: "", variants: [variant()] }),
    ).toThrow(InvalidProductError);
  });

  it("requires at least one variant", () => {
    expect(() =>
      Product.create({ id: randomUUID(), tenantId, venueId, name: "Ingresso", variants: [] }),
    ).toThrow(InvalidProductError);
  });

  it("rejects an availability window where availableFrom is after availableUntil", () => {
    expect(() =>
      Product.create({
        id: randomUUID(),
        tenantId,
        venueId,
        name: "Ingresso",
        variants: [variant()],
        availableFrom: new Date("2026-06-01"),
        availableUntil: new Date("2026-05-01"),
      }),
    ).toThrow(InvalidProductError);
  });

  it("is available at any time when no window is configured (spec: no window -> always available)", () => {
    const product = Product.create({ id: randomUUID(), tenantId, venueId, name: "Ingresso", variants: [variant()] });
    expect(product.isAvailableAt(new Date("2099-01-01"))).toBe(true);
  });

  it("is unavailable outside its configured window", () => {
    const product = Product.create({
      id: randomUUID(),
      tenantId,
      venueId,
      name: "Ingresso",
      variants: [variant()],
      availableFrom: new Date("2026-06-01"),
      availableUntil: new Date("2026-06-30"),
    });
    expect(product.isAvailableAt(new Date("2026-07-01"))).toBe(false);
    expect(product.isAvailableAt(new Date("2026-06-15"))).toBe(true);
  });

  it("is visible on every channel when no channel restriction is configured", () => {
    const product = Product.create({ id: randomUUID(), tenantId, venueId, name: "Ingresso", variants: [variant()] });
    expect(product.isVisibleOnChannel("web")).toBe(true);
    expect(product.isVisibleOnChannel("b2b")).toBe(true);
  });

  it("is hidden from a channel not in its whitelist (spec: Product hidden from a channel)", () => {
    const product = Product.create({
      id: randomUUID(),
      tenantId,
      venueId,
      name: "Ingresso",
      variants: [variant()],
      channels: ["web"],
    });
    expect(product.isVisibleOnChannel("web")).toBe(true);
    expect(product.isVisibleOnChannel("b2b")).toBe(false);
  });
});
