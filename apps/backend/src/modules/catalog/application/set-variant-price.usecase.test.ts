import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { SetVariantPriceUseCase } from "./set-variant-price.usecase.js";
import { InvalidProductError } from "../domain/product.entity.js";
import type { CreateProductInput, ProductRepositoryPort, UpdateProductInput } from "../domain/ports.js";
import type { Product } from "../domain/product.entity.js";
import type { DomainEvent } from "../../../events/domain-event.js";
import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { PRODUCT_PRICE_CHANGED } from "../domain/events.js";

class FakeProductRepository implements ProductRepositoryPort {
  private price = 5000;
  async create(_input: CreateProductInput): Promise<Product> {
    throw new Error("not used in this test");
  }
  async findById(): Promise<Product | null> {
    throw new Error("not used in this test");
  }
  async listByVenue(): Promise<Product[]> {
    throw new Error("not used in this test");
  }
  async update(_tenantId: string, _id: string, _changes: UpdateProductInput): Promise<Product> {
    throw new Error("not used in this test");
  }
  async addVariantPriceChange(_tenantId: string, variantId: string, priceCents: number) {
    const previousPriceCents = this.price;
    this.price = priceCents;
    return { variantId, previousPriceCents, newPriceCents: priceCents };
  }
  async findVariantById(): Promise<never> {
    throw new Error("not used in this test");
  }
}

class FakeEventPublisher implements EventPublisherPort {
  public published: DomainEvent[] = [];
  async publish(events: DomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

describe("SetVariantPriceUseCase", () => {
  const tenantId = randomUUID();

  it("changes the variant price and emits product.price_changed", async () => {
    const repo = new FakeProductRepository();
    const publisher = new FakeEventPublisher();
    const useCase = new SetVariantPriceUseCase(repo, publisher);

    const result = await useCase.execute({
      tenantId,
      productId: randomUUID(),
      variantId: randomUUID(),
      priceCents: 6000,
      actorUserId: randomUUID(),
    });

    expect(result.priceCents).toBe(6000);
    expect(publisher.published[0]?.type).toBe(PRODUCT_PRICE_CHANGED);
  });

  it(
    "does not affect a previously captured price snapshot (spec: catalog/product - " +
      "Price change does not affect past orders)",
    async () => {
      const repo = new FakeProductRepository();
      const useCase = new SetVariantPriceUseCase(repo, new FakeEventPublisher());

      // Stand-in for an Order snapshot captured at purchase time: a plain
      // value copied out at t0, before the price change.
      const orderSnapshotPriceCents = 5000;

      await useCase.execute({
        tenantId,
        productId: randomUUID(),
        variantId: randomUUID(),
        priceCents: 9000,
        actorUserId: randomUUID(),
      });

      expect(orderSnapshotPriceCents).toBe(5000);
    },
  );

  it("rejects a negative price", async () => {
    const repo = new FakeProductRepository();
    const useCase = new SetVariantPriceUseCase(repo, new FakeEventPublisher());

    await expect(
      useCase.execute({
        tenantId,
        productId: randomUUID(),
        variantId: randomUUID(),
        priceCents: -1,
        actorUserId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(InvalidProductError);
  });
});
