import type { Request } from "express";
import type { Trx, TxResult } from "../../../http/tx-route.js";
import { KyselyVenueRepository } from "../../venue/infrastructure/venue-repository.kysely.js";
import { KyselyOrganizationRepository } from "../../organization/infrastructure/organization-repository.kysely.js";
import { KyselyProductRepository } from "../../catalog/infrastructure/product-repository.kysely.js";
import { KyselyCapacityPeriodRepository } from "../../capacity/infrastructure/capacity-period-repository.kysely.js";
import { GetAvailableCapacityUseCase } from "../../capacity/application/get-available-capacity.usecase.js";
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
    return {
      status: 200,
      body: {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        organizationName: tenant.name,
        venueId: venue.id,
        venueSlug: venue.slug,
        venueName: venue.name,
        products: products.map((product) => ({
          id: product.id,
          name: product.name,
          variants: product.variants.map((variant) => ({
            id: variant.id,
            name: variant.name,
            priceCents: variant.priceCents,
            resourceId: variant.resourceId,
          })),
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
