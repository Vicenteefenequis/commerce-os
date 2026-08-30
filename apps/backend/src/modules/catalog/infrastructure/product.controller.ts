import type { Request } from "express";
import type { Trx, TxResult } from "../../../http/tx-route.js";
import { OutboxEventPublisher } from "../../../events/outbox-publisher.js";
import { KyselyVenueRepository } from "../../venue/infrastructure/venue-repository.kysely.js";
import {
  CreateProductUseCase,
  ParentVenueNotFoundError,
} from "../application/create-product.usecase.js";
import { UpdateProductUseCase, ProductNotFoundError } from "../application/update-product.usecase.js";
import { SetVariantPriceUseCase } from "../application/set-variant-price.usecase.js";
import { ListProductsUseCase } from "../application/list-products.usecase.js";
import { GetProductUseCase } from "../application/get-product.usecase.js";
import { InvalidProductError } from "../domain/product.entity.js";
import { KyselyProductRepository, VariantNotFoundError } from "./product-repository.kysely.js";

function serializeProduct(product: {
  id: string;
  tenantId: string;
  venueId: string;
  name: string;
  availableFrom: Date | null;
  availableUntil: Date | null;
  channels: string[];
  variants: Array<{ id: string; name: string; priceCents: number }>;
}) {
  return {
    id: product.id,
    venueId: product.venueId,
    name: product.name,
    availableFrom: product.availableFrom,
    availableUntil: product.availableUntil,
    channels: product.channels,
    variants: product.variants.map((v) => ({ id: v.id, name: v.name, priceCents: v.priceCents })),
  };
}

export async function createProductController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const { venueId, name, availableFrom, availableUntil, channels, variants } = req.body as {
    venueId?: string;
    name?: string;
    availableFrom?: string;
    availableUntil?: string;
    channels?: string[];
    variants?: Array<{ name: string; priceCents: number }>;
  };

  const useCase = new CreateProductUseCase(
    new KyselyVenueRepository(trx),
    new KyselyProductRepository(trx),
    new OutboxEventPublisher(trx),
  );

  try {
    const product = await useCase.execute({
      tenantId: identity.tenantId,
      venueId: venueId ?? "",
      name: name ?? "",
      availableFrom: availableFrom ? new Date(availableFrom) : undefined,
      availableUntil: availableUntil ? new Date(availableUntil) : undefined,
      channels,
      variants: variants ?? [],
      actorUserId: identity.userId,
    });
    return { status: 201, body: serializeProduct(product) };
  } catch (err) {
    if (err instanceof InvalidProductError) return { status: 400, body: { error: err.message } };
    if (err instanceof ParentVenueNotFoundError) return { status: 404, body: { error: err.message } };
    throw err;
  }
}

export async function listProductsController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const { venueId } = req.query as { venueId?: string };
  if (!venueId) return { status: 400, body: { error: "venueId query parameter is required" } };

  const products = await new ListProductsUseCase(new KyselyProductRepository(trx)).execute(
    identity.tenantId,
    venueId,
  );

  return { status: 200, body: { products: products.map(serializeProduct) } };
}

export async function getProductController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const { id } = req.params as { id: string };
  const product = await new GetProductUseCase(new KyselyProductRepository(trx)).execute(
    identity.tenantId,
    id,
  );
  if (!product) return { status: 404, body: { error: "product not found" } };

  return { status: 200, body: serializeProduct(product) };
}

export async function updateProductController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const { id } = req.params as { id: string };
  const { availableFrom, availableUntil, channels } = req.body as {
    availableFrom?: string | null;
    availableUntil?: string | null;
    channels?: string[];
  };

  const useCase = new UpdateProductUseCase(
    new KyselyProductRepository(trx),
    new OutboxEventPublisher(trx),
  );

  try {
    const product = await useCase.execute({
      tenantId: identity.tenantId,
      productId: id,
      actorUserId: identity.userId,
      availableFrom: availableFrom === undefined ? undefined : availableFrom ? new Date(availableFrom) : null,
      availableUntil:
        availableUntil === undefined ? undefined : availableUntil ? new Date(availableUntil) : null,
      channels,
    });
    return { status: 200, body: serializeProduct(product) };
  } catch (err) {
    if (err instanceof InvalidProductError) return { status: 400, body: { error: err.message } };
    if (err instanceof ProductNotFoundError) return { status: 404, body: { error: err.message } };
    throw err;
  }
}

export async function setVariantPriceController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const { id, variantId } = req.params as { id: string; variantId: string };
  const { priceCents } = req.body as { priceCents?: number };

  const useCase = new SetVariantPriceUseCase(
    new KyselyProductRepository(trx),
    new OutboxEventPublisher(trx),
  );

  try {
    const result = await useCase.execute({
      tenantId: identity.tenantId,
      productId: id,
      variantId,
      priceCents: priceCents ?? -1,
      actorUserId: identity.userId,
    });
    return { status: 200, body: result };
  } catch (err) {
    if (err instanceof InvalidProductError) return { status: 400, body: { error: err.message } };
    if (err instanceof VariantNotFoundError) return { status: 404, body: { error: err.message } };
    throw err;
  }
}
