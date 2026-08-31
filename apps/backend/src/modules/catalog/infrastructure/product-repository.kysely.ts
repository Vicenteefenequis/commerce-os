import { sql } from "kysely";
import type { Trx } from "../../../http/tx-route.js";
import { Product, ProductVariant } from "../domain/product.entity.js";
import type {
  CreateProductInput,
  ProductRepositoryPort,
  UpdateProductInput,
  VariantLookup,
} from "../domain/ports.js";

export class VariantNotFoundError extends Error {
  constructor() {
    super("product variant not found");
  }
}

export class KyselyProductRepository implements ProductRepositoryPort {
  constructor(private readonly trx: Trx) {}

  async create(input: CreateProductInput): Promise<Product> {
    const row = await this.trx
      .insertInto("products")
      .values({
        id: input.id,
        tenant_id: input.tenantId,
        venue_id: input.venueId,
        name: input.name,
        available_from: input.availableFrom ?? null,
        available_until: input.availableUntil ?? null,
        channels: input.channels ?? [],
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const variantRows = await Promise.all(
      input.variants.map((v) =>
        this.trx
          .insertInto("product_variants")
          .values({
            id: v.id,
            tenant_id: input.tenantId,
            product_id: row.id,
            name: v.name,
            price_cents: v.priceCents,
            resource_id: v.resourceId ?? null,
          })
          .returningAll()
          .executeTakeFirstOrThrow(),
      ),
    );

    return this.toDomain(row, variantRows);
  }

  async findById(tenantId: string, id: string): Promise<Product | null> {
    const row = await this.trx
      .selectFrom("products")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("id", "=", id)
      .executeTakeFirst();
    if (!row) return null;

    const variantRows = await this.trx
      .selectFrom("product_variants")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("product_id", "=", id)
      .execute();

    return this.toDomain(row, variantRows);
  }

  async listByVenue(tenantId: string, venueId: string): Promise<Product[]> {
    const rows = await this.trx
      .selectFrom("products")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("venue_id", "=", venueId)
      .execute();

    const products: Product[] = [];
    for (const row of rows) {
      const variantRows = await this.trx
        .selectFrom("product_variants")
        .selectAll()
        .where("tenant_id", "=", tenantId)
        .where("product_id", "=", row.id)
        .execute();
      products.push(this.toDomain(row, variantRows));
    }
    return products;
  }

  async update(tenantId: string, id: string, changes: UpdateProductInput): Promise<Product> {
    const updates: Record<string, unknown> = { updated_at: sql`now()` };
    if (changes.availableFrom !== undefined) updates.available_from = changes.availableFrom;
    if (changes.availableUntil !== undefined) updates.available_until = changes.availableUntil;
    if (changes.channels !== undefined) updates.channels = changes.channels;

    const row = await this.trx
      .updateTable("products")
      .set(updates)
      .where("tenant_id", "=", tenantId)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();

    const variantRows = await this.trx
      .selectFrom("product_variants")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("product_id", "=", id)
      .execute();

    return this.toDomain(row, variantRows);
  }

  async addVariantPriceChange(
    tenantId: string,
    variantId: string,
    priceCents: number,
  ): Promise<{ variantId: string; previousPriceCents: number; newPriceCents: number }> {
    const existing = await this.trx
      .selectFrom("product_variants")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("id", "=", variantId)
      .executeTakeFirst();
    if (!existing) {
      throw new VariantNotFoundError();
    }

    await this.trx
      .updateTable("product_variants")
      .set({ price_cents: priceCents, updated_at: sql`now()` })
      .where("tenant_id", "=", tenantId)
      .where("id", "=", variantId)
      .execute();

    return {
      variantId,
      previousPriceCents: existing.price_cents,
      newPriceCents: priceCents,
    };
  }

  async findVariantById(tenantId: string, variantId: string): Promise<VariantLookup | null> {
    const row = await this.trx
      .selectFrom("product_variants")
      .innerJoin("products", "products.id", "product_variants.product_id")
      .select([
        "product_variants.id as id",
        "product_variants.product_id as productId",
        "products.venue_id as venueId",
        "product_variants.name as name",
        "product_variants.price_cents as priceCents",
        "product_variants.resource_id as resourceId",
      ])
      .where("product_variants.tenant_id", "=", tenantId)
      .where("product_variants.id", "=", variantId)
      .executeTakeFirst();
    return row ?? null;
  }

  private toDomain(
    row: { id: string; tenant_id: string; venue_id: string; name: string; available_from: unknown; available_until: unknown; channels: string[] },
    variantRows: Array<{
      id: string;
      product_id: string;
      tenant_id: string;
      name: string;
      price_cents: number;
      resource_id: string | null;
    }>,
  ): Product {
    return Product.create({
      id: row.id,
      tenantId: row.tenant_id,
      venueId: row.venue_id,
      name: row.name,
      availableFrom: row.available_from ? new Date(row.available_from as string) : null,
      availableUntil: row.available_until ? new Date(row.available_until as string) : null,
      channels: row.channels,
      variants: variantRows.map((v) =>
        ProductVariant.create({
          id: v.id,
          productId: v.product_id,
          tenantId: v.tenant_id,
          name: v.name,
          priceCents: v.price_cents,
          resourceId: v.resource_id,
        }),
      ),
    });
  }
}
