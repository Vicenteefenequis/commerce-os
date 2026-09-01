import type { Request } from "express";
import type { Trx, TxResult } from "../../../http/tx-route.js";
import { KyselyVenueRepository } from "../../venue/infrastructure/venue-repository.kysely.js";
import { KyselyProductRepository } from "../../catalog/infrastructure/product-repository.kysely.js";
import { KyselyCapacityPeriodRepository } from "../../capacity/infrastructure/capacity-period-repository.kysely.js";
import { GetAvailableCapacityUseCase } from "../../capacity/application/get-available-capacity.usecase.js";
import { ListVenuesUseCase } from "../../venue/application/list-venues.usecase.js";
import {
  ListStorefrontProductsUseCase,
  VenueNotFoundError,
} from "../application/list-storefront-products.usecase.js";
import {
  GetStorefrontVariantAvailabilityUseCase,
  VariantNotFoundError,
} from "../application/get-storefront-variant-availability.usecase.js";

export async function listStorefrontVenuesController(req: Request, trx: Trx): Promise<TxResult> {
  const { tenantId } = req.params as { tenantId: string };

  const venues = await new ListVenuesUseCase(new KyselyVenueRepository(trx)).execute(tenantId);

  return {
    status: 200,
    body: { venues: venues.map((venue) => ({ id: venue.id, name: venue.name })) },
  };
}

export async function listStorefrontProductsController(req: Request, trx: Trx): Promise<TxResult> {
  const { tenantId, venueId } = req.params as { tenantId: string; venueId: string };

  const useCase = new ListStorefrontProductsUseCase(
    new KyselyVenueRepository(trx),
    new KyselyProductRepository(trx),
  );

  try {
    const products = await useCase.execute(tenantId, venueId);
    return {
      status: 200,
      body: {
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
    if (err instanceof VenueNotFoundError) return { status: 404, body: { error: err.message } };
    throw err;
  }
}

export async function getStorefrontVariantAvailabilityController(req: Request, trx: Trx): Promise<TxResult> {
  const { tenantId, variantId } = req.params as { tenantId: string; variantId: string };
  const { period } = req.query as { period?: string };
  if (!period) return { status: 400, body: { error: "period query parameter is required" } };

  const useCase = new GetStorefrontVariantAvailabilityUseCase(
    new KyselyProductRepository(trx),
    new GetAvailableCapacityUseCase(new KyselyCapacityPeriodRepository(trx)),
  );

  try {
    const result = await useCase.execute(tenantId, variantId, period);
    return { status: 200, body: result };
  } catch (err) {
    if (err instanceof VariantNotFoundError) return { status: 404, body: { error: err.message } };
    throw err;
  }
}
