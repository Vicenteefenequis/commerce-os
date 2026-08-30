import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { InvalidProductError, Product } from "../domain/product.entity.js";
import { productUpdatedEvent } from "../domain/events.js";
import type { ProductRepositoryPort, UpdateProductInput } from "../domain/ports.js";

export class ProductNotFoundError extends Error {
  constructor() {
    super("product not found");
  }
}

export interface UpdateProductUseCaseInput extends UpdateProductInput {
  tenantId: string;
  productId: string;
  actorUserId: string;
}

/**
 * spec: catalog/product - "Product availability window",
 * "Product channel visibility". Never touches variant price (that is
 * SetVariantPriceUseCase) or persisted order snapshots - orders are out
 * of scope for this change, so there is nothing here that could mutate
 * one (spec: "Price change does not affect past orders").
 */
export class UpdateProductUseCase {
  constructor(
    private readonly products: ProductRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(input: UpdateProductUseCaseInput): Promise<Product> {
    const existing = await this.products.findById(input.tenantId, input.productId);
    if (!existing) {
      throw new ProductNotFoundError();
    }

    const availableFrom = input.availableFrom !== undefined ? input.availableFrom : existing.availableFrom;
    const availableUntil =
      input.availableUntil !== undefined ? input.availableUntil : existing.availableUntil;
    if (availableFrom && availableUntil && availableFrom.getTime() > availableUntil.getTime()) {
      throw new InvalidProductError("availableFrom must not be after availableUntil");
    }

    const updated = await this.products.update(input.tenantId, input.productId, {
      availableFrom: input.availableFrom,
      availableUntil: input.availableUntil,
      channels: input.channels,
    });

    await this.eventPublisher.publish([
      productUpdatedEvent(input.tenantId, {
        productId: updated.id,
        actorUserId: input.actorUserId,
        changes: {
          availableFrom: input.availableFrom,
          availableUntil: input.availableUntil,
          channels: input.channels,
        },
      }),
    ]);

    return updated;
  }
}
