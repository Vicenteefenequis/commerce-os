import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { GetProductUseCase } from "./get-product.usecase.js";
import { ListProductsUseCase } from "./list-products.usecase.js";
import { Product, ProductVariant } from "../domain/product.entity.js";
import type { ProductRepositoryPort, UpdateProductInput } from "../domain/ports.js";

class FakeProductRepository implements ProductRepositoryPort {
  private store = new Map<string, Product>();
  seed(product: Product) {
    this.store.set(product.id, product);
  }
  async create(): Promise<Product> {
    throw new Error("not used in this test");
  }
  async findById(tenantId: string, id: string): Promise<Product | null> {
    const product = this.store.get(id);
    return product && product.tenantId === tenantId ? product : null;
  }
  async listByVenue(tenantId: string, venueId: string): Promise<Product[]> {
    return [...this.store.values()].filter((p) => p.tenantId === tenantId && p.venueId === venueId);
  }
  async update(_tenantId: string, _id: string, _changes: UpdateProductInput): Promise<Product> {
    throw new Error("not used in this test");
  }
  async addVariantPriceChange(): Promise<{ variantId: string; previousPriceCents: number; newPriceCents: number }> {
    throw new Error("not used in this test");
  }
}

function makeProduct(tenantId: string, venueId: string) {
  return Product.create({
    id: randomUUID(),
    tenantId,
    venueId,
    name: "Ingresso",
    variants: [
      ProductVariant.create({ id: randomUUID(), productId: randomUUID(), tenantId, name: "Adulto", priceCents: 5000 }),
    ],
  });
}

describe("GetProductUseCase", () => {
  it("returns a product scoped to its owning tenant", async () => {
    const tenantId = randomUUID();
    const venueId = randomUUID();
    const repo = new FakeProductRepository();
    const product = makeProduct(tenantId, venueId);
    repo.seed(product);

    const found = await new GetProductUseCase(repo).execute(tenantId, product.id);
    expect(found?.id).toBe(product.id);
  });

  it("does not return a product belonging to a different tenant (spec: catalog/product - Product is isolated by tenant)", async () => {
    const tenantA = randomUUID();
    const tenantB = randomUUID();
    const venueId = randomUUID();
    const repo = new FakeProductRepository();
    const product = makeProduct(tenantA, venueId);
    repo.seed(product);

    const found = await new GetProductUseCase(repo).execute(tenantB, product.id);
    expect(found).toBeNull();
  });
});

describe("ListProductsUseCase", () => {
  it("lists only products belonging to the requesting tenant's venue", async () => {
    const tenantA = randomUUID();
    const tenantB = randomUUID();
    const venueId = randomUUID();
    const repo = new FakeProductRepository();
    repo.seed(makeProduct(tenantA, venueId));
    repo.seed(makeProduct(tenantB, venueId));

    const products = await new ListProductsUseCase(repo).execute(tenantA, venueId);
    expect(products).toHaveLength(1);
    expect(products[0]?.tenantId).toBe(tenantA);
  });
});
