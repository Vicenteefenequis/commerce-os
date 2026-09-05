import type { Request } from "express";
import type { Trx, TxResult } from "../../../http/tx-route.js";
import { KyselyVenueRepository } from "../../venue/infrastructure/venue-repository.kysely.js";
import { KyselyOrganizationRepository } from "../../organization/infrastructure/organization-repository.kysely.js";
import { KyselyProductRepository } from "../../catalog/infrastructure/product-repository.kysely.js";
import { KyselyCapacityPeriodRepository } from "../../capacity/infrastructure/capacity-period-repository.kysely.js";
import { GetAvailableCapacityUseCase } from "../../capacity/application/get-available-capacity.usecase.js";
import { GetProductAggregateCapacityUseCase } from "../../capacity/application/get-product-aggregate-capacity.usecase.js";
import type { Product } from "../../catalog/domain/product.entity.js";
import { productPeriod } from "../application/product-period.js";
import { KyselyTenantContext } from "./tenant-context.kysely.js";
import {
  ResolveStorefrontTenantUseCase,
  TenantNotFoundError,
} from "../application/resolve-storefront-tenant.usecase.js";
import { ListStorefrontVenuesUseCase } from "../application/list-storefront-venues.usecase.js";
import {
  ListStorefrontProductsUseCase,
  VenueNotFoundError,
} from "../application/list-storefront-products.usecase.js";
import {
  GetStorefrontVariantAvailabilityUseCase,
  VariantNotFoundError,
} from "../application/get-storefront-variant-availability.usecase.js";
import { GetStorefrontVenueProfileUseCase } from "../application/get-storefront-venue-profile.usecase.js";
import {
  type AvailabilityFilter,
  ListDiscoverableTenantsUseCase,
} from "../application/list-discoverable-tenants.usecase.js";

/**
 * spec: storefront/catalog - "Product with resource-backed variants includes
 * an aggregate capacity figure". Returns null when the product has no
 * resource-backed variants, per "Product without resource-backed variants
 * omits the capacity figure".
 */
async function getProductCapacityPercentFull(
  trx: Trx,
  tenantId: string,
  product: Product,
  now: Date,
): Promise<number | null> {
  const resourceIds = product.variants
    .map((variant) => variant.resourceId)
    .filter((resourceId): resourceId is string => resourceId != null);
  if (resourceIds.length === 0) return null;

  const useCase = new GetProductAggregateCapacityUseCase(new KyselyCapacityPeriodRepository(trx));
  const aggregate = await useCase.execute(tenantId, resourceIds, productPeriod(product, now));
  return aggregate?.percentFull ?? null;
}

/**
 * spec: storefront/showcase - "Profile stat tiles summarize active offers".
 * Sums each currently-available Product's remaining resource-backed
 * capacity; a Product with no resource-backed variants contributes nothing
 * (it has no capacity concept to combine).
 */
async function sumRemainingCapacity(
  trx: Trx,
  tenantId: string,
  products: Product[],
  now: Date,
): Promise<number> {
  const useCase = new GetProductAggregateCapacityUseCase(new KyselyCapacityPeriodRepository(trx));
  const totals = await Promise.all(
    products.map((product) => {
      const resourceIds = product.variants
        .map((variant) => variant.resourceId)
        .filter((resourceId): resourceId is string => resourceId != null);
      if (resourceIds.length === 0) return Promise.resolve(0);
      return useCase
        .execute(tenantId, resourceIds, productPeriod(product, now))
        .then((aggregate) => aggregate?.availableCapacity ?? 0);
    }),
  );
  return totals.reduce((sum, value) => sum + value, 0);
}

export async function getStorefrontTenantController(req: Request, trx: Trx): Promise<TxResult> {
  const { tenantSlug } = req.params as { tenantSlug: string };

  const useCase = new ResolveStorefrontTenantUseCase(
    new KyselyOrganizationRepository(trx),
    new KyselyTenantContext(trx),
  );

  try {
    const tenant = await useCase.execute(tenantSlug);
    return {
      status: 200,
      body: { tenantId: tenant.id, tenantSlug: tenant.slug, organizationName: tenant.name },
    };
  } catch (err) {
    if (err instanceof TenantNotFoundError) return { status: 404, body: { error: err.message } };
    throw err;
  }
}

export async function listStorefrontVenuesController(req: Request, trx: Trx): Promise<TxResult> {
  const { tenantSlug } = req.params as { tenantSlug: string };

  const useCase = new ListStorefrontVenuesUseCase(
    new KyselyOrganizationRepository(trx),
    new KyselyVenueRepository(trx),
    new KyselyTenantContext(trx),
  );

  try {
    const { tenant, venues } = await useCase.execute(tenantSlug);
    return {
      status: 200,
      body: {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        organizationName: tenant.name,
        venues: venues.map((venue) => ({
          id: venue.id,
          slug: venue.slug,
          name: venue.name,
          category: venue.category,
          address: venue.address,
          city: venue.city,
          coverPhotoUrl: venue.coverPhotoUrl,
        })),
      },
    };
  } catch (err) {
    if (err instanceof TenantNotFoundError) return { status: 404, body: { error: err.message } };
    throw err;
  }
}

export async function listStorefrontProductsController(req: Request, trx: Trx): Promise<TxResult> {
  const { tenantSlug, venueSlug } = req.params as { tenantSlug: string; venueSlug: string };

  const useCase = new ListStorefrontProductsUseCase(
    new KyselyOrganizationRepository(trx),
    new KyselyVenueRepository(trx),
    new KyselyProductRepository(trx),
    new KyselyTenantContext(trx),
  );

  try {
    const { tenant, venue, products } = await useCase.execute(tenantSlug, venueSlug);
    const now = new Date();
    const capacities = await Promise.all(
      products.map((product) => getProductCapacityPercentFull(trx, tenant.id, product, now)),
    );

    return {
      status: 200,
      body: {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        organizationName: tenant.name,
        venueId: venue.id,
        venueSlug: venue.slug,
        venueName: venue.name,
        products: products.map((product, index) => ({
          id: product.id,
          name: product.name,
          variants: product.variants.map((variant) => ({
            id: variant.id,
            name: variant.name,
            priceCents: variant.priceCents,
            resourceId: variant.resourceId,
          })),
          ...(capacities[index] != null ? { capacityPercentFull: capacities[index] } : {}),
        })),
      },
    };
  } catch (err) {
    if (err instanceof TenantNotFoundError || err instanceof VenueNotFoundError) {
      return { status: 404, body: { error: err.message } };
    }
    throw err;
  }
}

export async function getStorefrontVenueProfileController(req: Request, trx: Trx): Promise<TxResult> {
  const { tenantSlug, venueSlug } = req.params as { tenantSlug: string; venueSlug: string };

  const useCase = new GetStorefrontVenueProfileUseCase(
    new KyselyOrganizationRepository(trx),
    new KyselyVenueRepository(trx),
    new KyselyTenantContext(trx),
  );

  try {
    const { tenant, venue } = await useCase.execute(tenantSlug, venueSlug);

    const productsUseCase = new ListStorefrontProductsUseCase(
      new KyselyOrganizationRepository(trx),
      new KyselyVenueRepository(trx),
      new KyselyProductRepository(trx),
      new KyselyTenantContext(trx),
    );
    const now = new Date();
    const { products } = await productsUseCase.execute(tenantSlug, venueSlug, now);
    const activeOfferCount = products.length;
    const remainingCapacity = await sumRemainingCapacity(trx, tenant.id, products, now);

    return {
      status: 200,
      body: {
        tenantSlug: tenant.slug,
        organizationName: tenant.name,
        venueSlug: venue.slug,
        venueName: venue.name,
        description: venue.description,
        address: venue.address,
        city: venue.city,
        category: venue.category,
        coverPhotoUrl: venue.coverPhotoUrl,
        ageRestriction: venue.ageRestriction,
        activeOfferCount,
        remainingCapacity,
      },
    };
  } catch (err) {
    if (err instanceof TenantNotFoundError || err instanceof VenueNotFoundError) {
      return { status: 404, body: { error: err.message } };
    }
    throw err;
  }
}

export async function listDiscoverableTenantsController(req: Request, trx: Trx): Promise<TxResult> {
  const { q, category, when, availability, maxPriceCents, lat, lng } = req.query as {
    q?: string;
    category?: string;
    when?: string;
    availability?: AvailabilityFilter;
    maxPriceCents?: string;
    lat?: string;
    lng?: string;
  };

  const useCase = new ListDiscoverableTenantsUseCase(
    new KyselyOrganizationRepository(trx),
    new KyselyVenueRepository(trx),
    new KyselyProductRepository(trx),
    new KyselyCapacityPeriodRepository(trx),
    new KyselyTenantContext(trx),
  );

  const result = await useCase.execute({
    q,
    category,
    when,
    availability,
    maxPriceCents: maxPriceCents !== undefined ? Number(maxPriceCents) : undefined,
    lat: lat !== undefined ? Number(lat) : undefined,
    lng: lng !== undefined ? Number(lng) : undefined,
  });
  return { status: 200, body: result };
}

export async function getStorefrontVariantAvailabilityController(req: Request, trx: Trx): Promise<TxResult> {
  const { tenantSlug, venueSlug, variantId } = req.params as {
    tenantSlug: string;
    venueSlug: string;
    variantId: string;
  };
  const { period } = req.query as { period?: string };
  if (!period) return { status: 400, body: { error: "period query parameter is required" } };

  const useCase = new GetStorefrontVariantAvailabilityUseCase(
    new KyselyOrganizationRepository(trx),
    new KyselyVenueRepository(trx),
    new KyselyProductRepository(trx),
    new GetAvailableCapacityUseCase(new KyselyCapacityPeriodRepository(trx)),
    new KyselyTenantContext(trx),
  );

  try {
    const result = await useCase.execute(tenantSlug, venueSlug, variantId, period);
    return { status: 200, body: result };
  } catch (err) {
    if (
      err instanceof TenantNotFoundError ||
      err instanceof VenueNotFoundError ||
      err instanceof VariantNotFoundError
    ) {
      return { status: 404, body: { error: err.message } };
    }
    throw err;
  }
}
