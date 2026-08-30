import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ProductNotFoundError, UpdateProductUseCase } from "./update-product.usecase.js";
import { Product, ProductVariant } from "../domain/product.entity.js";
import type {
  CreateProductInput,
  ProductRepositoryPort,
  UpdateProductInput,
} from "../domain/ports.js";
import type { DomainEvent } from "../../../events/domain-event.js";
import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { PRODUCT_UPDATED } from "../domain/events.js";

class FakeProductRepository implements ProductRepositoryPort {
  private store = new Map<string, Product>();

  seed(product: Product) {
    this.store.set(product.id, product);
  }

  async create(_input: CreateProductInput): Promise<Product> {
    throw new Error("not used in this test");
  }
  async findById(tenantId: string, id: string): Promise<Product | null> {
    const product = this.store.get(id);
    return product && product.tenantId === tenantId ? product : null;
  }
  async listByVenue(): Promise<Product[]> {
    throw new Error("not used in this test");
  }
  async update(tenantId: string, id: string, changes: UpdateProductInput): Promise<Product> {
    const existing = this.store.get(id);
    if (!existing || existing.tenantId !== tenantId) throw new Error("not found");
    const updated = Product.create({
      id: existing.id,
      tenantId: existing.tenantId,
      venueId: existing.venueId,
      name: existing.name,
      availableFrom: changes.availableFrom !== undefined ? changes.availableFrom : existing.availableFrom,
      availableUntil:
        changes.availableUntil !== undefined ? changes.availableUntil : existing.availableUntil,
      channels: changes.channels !== undefined ? changes.channels : existing.channels,
      variants: existing.variants,
    });
    this.store.set(id, updated);
    return updated;
  }
  async addVariantPriceChange(): Promise<{ variantId: string; previousPriceCents: number; newPriceCents: number }> {
    throw new Error("not used in this test");
  }
}

class FakeEventPublisher implements EventPublisherPort {
  public published: DomainEvent[] = [];
  async publish(events: DomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

describe("UpdateProductUseCase", () => {
  const tenantId = randomUUID();
  const venueId = randomUUID();

  function makeProduct() {
    return Product.create({
      id: randomUUID(),
      tenantId,
      venueId,
      name: "Ingresso",
      variants: [ProductVariant.create({ id: randomUUID(), productId: randomUUID(), tenantId, name: "Adulto", priceCents: 5000 })],
    });
  }

  it("updates the availability window and emits product.updated", async () => {
    const repo = new FakeProductRepository();
    const product = makeProduct();
    repo.seed(product);
    const publisher = new FakeEventPublisher();
    const useCase = new UpdateProductUseCase(repo, publisher);

    const updated = await useCase.execute({
      tenantId,
      productId: product.id,
      actorUserId: randomUUID(),
      availableFrom: new Date("2026-06-01"),
      availableUntil: new Date("2026-06-30"),
    });

    expect(updated.availableFrom?.toISOString()).toBe(new Date("2026-06-01").toISOString());
    expect(publisher.published[0]?.type).toBe(PRODUCT_UPDATED);
  });

  it("rejects updating a product that does not exist", async () => {
    const repo = new FakeProductRepository();
    const useCase = new UpdateProductUseCase(repo, new FakeEventPublisher());

    await expect(
      useCase.execute({ tenantId, productId: randomUUID(), actorUserId: randomUUID(), channels: ["web"] }),
    ).rejects.toBeInstanceOf(ProductNotFoundError);
  });
});
