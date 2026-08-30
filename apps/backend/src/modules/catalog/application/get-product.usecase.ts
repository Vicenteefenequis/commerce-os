import type { Product } from "../domain/product.entity.js";
import type { ProductRepositoryPort } from "../domain/ports.js";

/**
 * spec: catalog/product - "Product is isolated by tenant". Scoping the
 * lookup by tenantId (rather than fetching by id then checking) means a
 * cross-tenant id simply does not match any row - no data from another
 * tenant is ever loaded into memory, on top of the RLS backstop.
 */
export class GetProductUseCase {
  constructor(private readonly products: ProductRepositoryPort) {}

  async execute(tenantId: string, id: string): Promise<Product | null> {
    return this.products.findById(tenantId, id);
  }
}
