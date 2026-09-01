import type { Product } from "../../catalog/domain/product.entity.js";
import type { ProductRepositoryPort } from "../../catalog/domain/ports.js";
import type { VenueRepositoryPort } from "../../venue/domain/ports.js";

export class VenueNotFoundError extends Error {
  constructor() {
    super("venue not found");
  }
}

const STOREFRONT_CHANNEL = "storefront";

/** spec: storefront/catalog - "Storefront product listing respects channel visibility and availability window". */
export class ListStorefrontProductsUseCase {
  constructor(
    private readonly venues: VenueRepositoryPort,
    private readonly products: ProductRepositoryPort,
  ) {}

  async execute(tenantId: string, venueId: string, now: Date = new Date()): Promise<Product[]> {
    const venue = await this.venues.findById(tenantId, venueId);
    if (!venue) throw new VenueNotFoundError();

    const products = await this.products.listByVenue(tenantId, venueId);
    return products.filter(
      (product) => product.isVisibleOnChannel(STOREFRONT_CHANNEL) && product.isAvailableAt(now),
    );
  }
}
