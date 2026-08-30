import { randomUUID } from "node:crypto";
import type { VenueRepositoryPort } from "../../venue/domain/ports.js";
import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { Product, ProductVariant } from "../domain/product.entity.js";
import { productCreatedEvent } from "../domain/events.js";
import type { ProductRepositoryPort } from "../domain/ports.js";

export class ParentVenueNotFoundError extends Error {
  constructor() {
    super("parent venue does not exist");
  }
}

export interface CreateProductInput {
  tenantId: string;
  venueId: string;
  name: string;
  availableFrom?: Date | null;
  availableUntil?: Date | null;
  channels?: string[];
  variants: Array<{ name: string; priceCents: number }>;
  actorUserId: string;
}

/** spec: catalog/product - "Product creation under a venue". */
export class CreateProductUseCase {
  constructor(
    private readonly venues: VenueRepositoryPort,
    private readonly products: ProductRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(input: CreateProductInput): Promise<Product> {
    const venues = await this.venues.listByTenant(input.tenantId);
    const venue = venues.find((v) => v.id === input.venueId);
    if (!venue) {
      throw new ParentVenueNotFoundError();
    }

    const draftVariants = input.variants.map((v) =>
      ProductVariant.create({
        id: randomUUID(),
        productId: "", // not yet assigned; entity-level check only needs name/price
        tenantId: input.tenantId,
        name: v.name,
        priceCents: v.priceCents,
      }),
    );

    // Validate shape via the domain entity before persisting (fail fast
    // with InvalidProductError, same validation the DB constraints enforce).
    Product.create({
      id: randomUUID(),
      tenantId: input.tenantId,
      venueId: input.venueId,
      name: input.name,
      availableFrom: input.availableFrom,
      availableUntil: input.availableUntil,
      channels: input.channels,
      variants: draftVariants,
    });

    const product = await this.products.create({
      id: randomUUID(),
      tenantId: input.tenantId,
      venueId: input.venueId,
      name: input.name,
      availableFrom: input.availableFrom,
      availableUntil: input.availableUntil,
      channels: input.channels,
      variants: draftVariants.map((v) => ({ id: v.id, name: v.name, priceCents: v.priceCents })),
    });

    await this.eventPublisher.publish([
      productCreatedEvent(input.tenantId, {
        productId: product.id,
        venueId: product.venueId,
        name: product.name,
        actorUserId: input.actorUserId,
      }),
    ]);

    return product;
  }
}
