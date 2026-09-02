import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { CreateProductUseCase, ParentVenueNotFoundError } from "./create-product.usecase.js";
import { Product, ProductVariant } from "../domain/product.entity.js";
import { InvalidProductError } from "../domain/product.entity.js";
import type {
  CreateProductInput,
  ProductRepositoryPort,
  UpdateProductInput,
} from "../domain/ports.js";
import { Venue } from "../../venue/domain/venue.entity.js";
import type { VenueRepositoryPort } from "../../venue/domain/ports.js";
import type { DomainEvent } from "../../../events/domain-event.js";
import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { PRODUCT_CREATED } from "../domain/events.js";

class FakeVenueRepository implements VenueRepositoryPort {
  constructor(private readonly venues: Venue[]) {}
  async create(): Promise<Venue> {
    throw new Error("not used in this test");
  }
  async listByTenant(tenantId: string): Promise<Venue[]> {
    return this.venues.filter((v) => v.tenantId === tenantId);
  }
  async findById(tenantId: string, id: string): Promise<Venue | null> {
    return this.venues.find((v) => v.tenantId === tenantId && v.id === id) ?? null;
  }
  async findBySlug(): Promise<Venue | null> {
    throw new Error("not used in this test");
  }
}

class FakeProductRepository implements ProductRepositoryPort {
  public created: Product[] = [];
  async create(input: CreateProductInput): Promise<Product> {
    const product = Product.create({
      id: input.id,
      tenantId: input.tenantId,
      venueId: input.venueId,
      name: input.name,
      availableFrom: input.availableFrom,
      availableUntil: input.availableUntil,
      channels: input.channels,
      variants: input.variants.map((v) =>
        ProductVariant.create({
          id: v.id,
          productId: input.id,
          tenantId: input.tenantId,
          name: v.name,
          priceCents: v.priceCents,
          resourceId: v.resourceId,
        }),
      ),
    });
    this.created.push(product);
    return product;
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
  async addVariantPriceChange(): Promise<{ variantId: string; previousPriceCents: number; newPriceCents: number }> {
    throw new Error("not used in this test");
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

describe("CreateProductUseCase", () => {
  const tenantId = randomUUID();
  const venue = Venue.create({ id: randomUUID(), tenantId, name: "Unidade Norte", slug: "unidade-norte" });

  it("creates a product with variants under an existing venue", async () => {
    const products = new FakeProductRepository();
    const publisher = new FakeEventPublisher();
    const useCase = new CreateProductUseCase(new FakeVenueRepository([venue]), products, publisher);

    const product = await useCase.execute({
      tenantId,
      venueId: venue.id,
      name: "Ingresso",
      variants: [
        { name: "Adulto", priceCents: 5000 },
        { name: "Criança", priceCents: 2500 },
      ],
      actorUserId: randomUUID(),
    });

    expect(products.created).toHaveLength(1);
    expect(product.variants).toHaveLength(2);
    expect(product.variants[0]?.resourceId).toBeNull();
    expect(publisher.published[0]?.type).toBe(PRODUCT_CREATED);
  });

  it("creates a variant with a resourceId, holding capacity for that Resource", async () => {
    const products = new FakeProductRepository();
    const useCase = new CreateProductUseCase(
      new FakeVenueRepository([venue]),
      products,
      new FakeEventPublisher(),
    );
    const resourceId = randomUUID();

    const product = await useCase.execute({
      tenantId,
      venueId: venue.id,
      name: "Ingresso com vaga",
      variants: [{ name: "Adulto", priceCents: 5000, resourceId }],
      actorUserId: randomUUID(),
    });

    expect(product.variants[0]?.resourceId).toBe(resourceId);
  });

  it("rejects product creation when the parent venue does not exist", async () => {
    const products = new FakeProductRepository();
    const useCase = new CreateProductUseCase(
      new FakeVenueRepository([]),
      products,
      new FakeEventPublisher(),
    );

    await expect(
      useCase.execute({
        tenantId,
        venueId: randomUUID(),
        name: "Ingresso",
        variants: [{ name: "Adulto", priceCents: 5000 }],
        actorUserId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(ParentVenueNotFoundError);
    expect(products.created).toHaveLength(0);
  });

  it("rejects product creation without variants", async () => {
    const products = new FakeProductRepository();
    const useCase = new CreateProductUseCase(
      new FakeVenueRepository([venue]),
      products,
      new FakeEventPublisher(),
    );

    await expect(
      useCase.execute({ tenantId, venueId: venue.id, name: "Ingresso", variants: [], actorUserId: randomUUID() }),
    ).rejects.toBeInstanceOf(InvalidProductError);
  });
});
