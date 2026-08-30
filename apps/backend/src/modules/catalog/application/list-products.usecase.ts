import type { Product } from "../domain/product.entity.js";
import type { ProductRepositoryPort } from "../domain/ports.js";

/** spec: catalog/product - "Product belongs to a single tenant". */
export class ListProductsUseCase {
  constructor(private readonly products: ProductRepositoryPort) {}

  async execute(tenantId: string, venueId: string): Promise<Product[]> {
    return this.products.listByVenue(tenantId, venueId);
  }
}
