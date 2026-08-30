import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { InvalidProductError } from "../domain/product.entity.js";
import { productPriceChangedEvent } from "../domain/events.js";
import type { ProductRepositoryPort } from "../domain/ports.js";

export interface SetVariantPriceInput {
  tenantId: string;
  productId: string;
  variantId: string;
  priceCents: number;
  actorUserId: string;
}

/**
 * spec: catalog/product - "Product pricing", "Price change does not
 * affect past orders" (the price lives only on the variant row here;
 * an Order, when it exists, will snapshot the price at purchase time
 * rather than reference this row - that snapshotting is Order's
 * responsibility in a future change, not this use case's).
 */
export class SetVariantPriceUseCase {
  constructor(
    private readonly products: ProductRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(input: SetVariantPriceInput): Promise<{ variantId: string; priceCents: number }> {
    if (!Number.isInteger(input.priceCents) || input.priceCents < 0) {
      throw new InvalidProductError("price is required and must be a non-negative integer");
    }

    const result = await this.products.addVariantPriceChange(
      input.tenantId,
      input.variantId,
      input.priceCents,
    );

    await this.eventPublisher.publish([
      productPriceChangedEvent(input.tenantId, {
        productId: input.productId,
        variantId: result.variantId,
        previousPriceCents: result.previousPriceCents,
        newPriceCents: result.newPriceCents,
        actorUserId: input.actorUserId,
      }),
    ]);

    return { variantId: result.variantId, priceCents: result.newPriceCents };
  }
}
