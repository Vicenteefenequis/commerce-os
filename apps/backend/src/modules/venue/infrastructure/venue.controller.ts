import type { Request } from "express";
import type { Trx, TxResult } from "../../../http/tx-route.js";
import { KyselyOrganizationRepository } from "../../organization/infrastructure/organization-repository.kysely.js";
import {
  CreateVenueUseCase,
  InvalidVenueSlugError,
  ParentOrganizationNotFoundError,
  VenueSlugAlreadyExistsError,
} from "../application/create-venue.usecase.js";
import { ListVenuesUseCase } from "../application/list-venues.usecase.js";
import { UpdateVenueUseCase, VenueNotFoundError } from "../application/update-venue.usecase.js";
import { InvalidVenueError } from "../domain/venue.entity.js";
import { KyselyVenueRepository } from "./venue-repository.kysely.js";

export async function createVenueController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const { name, slug } = req.body as { name?: string; slug?: string };
  const useCase = new CreateVenueUseCase(
    new KyselyOrganizationRepository(trx),
    new KyselyVenueRepository(trx),
  );

  try {
    const venue = await useCase.execute({ tenantId: identity.tenantId, name: name ?? "", slug });
    return {
      status: 201,
      body: { id: venue.id, tenantId: venue.tenantId, name: venue.name, slug: venue.slug },
    };
  } catch (err) {
    if (err instanceof InvalidVenueError || err instanceof InvalidVenueSlugError) {
      return { status: 400, body: { error: err.message } };
    }
    if (err instanceof ParentOrganizationNotFoundError) {
      return { status: 404, body: { error: err.message } };
    }
    if (err instanceof VenueSlugAlreadyExistsError) {
      return { status: 409, body: { error: err.message } };
    }
    throw err;
  }
}

export async function listVenuesController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const venues = await new ListVenuesUseCase(new KyselyVenueRepository(trx)).execute(
    identity.tenantId,
  );

  return {
    status: 200,
    body: {
      venues: venues.map((venue) => ({
        id: venue.id,
        name: venue.name,
        slug: venue.slug,
        description: venue.description,
        address: venue.address,
        city: venue.city,
        category: venue.category,
        coverPhotoUrl: venue.coverPhotoUrl,
        published: venue.published,
        latitude: venue.latitude,
        longitude: venue.longitude,
      })),
    },
  };
}

export async function updateVenueController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const { id } = req.params as { id: string };
  const { description, address, city, category, coverPhotoUrl, published, latitude, longitude } =
    req.body as {
      description?: string | null;
      address?: string | null;
      city?: string | null;
      category?: string | null;
      coverPhotoUrl?: string | null;
      published?: boolean;
      latitude?: number | null;
      longitude?: number | null;
    };

  const useCase = new UpdateVenueUseCase(new KyselyVenueRepository(trx));

  try {
    const venue = await useCase.execute(identity.tenantId, id, {
      description,
      address,
      city,
      category,
      coverPhotoUrl,
      published,
      latitude,
      longitude,
    });
    return {
      status: 200,
      body: {
        id: venue.id,
        name: venue.name,
        slug: venue.slug,
        description: venue.description,
        address: venue.address,
        city: venue.city,
        category: venue.category,
        coverPhotoUrl: venue.coverPhotoUrl,
        published: venue.published,
        latitude: venue.latitude,
        longitude: venue.longitude,
      },
    };
  } catch (err) {
    if (err instanceof InvalidVenueError) return { status: 400, body: { error: err.message } };
    if (err instanceof VenueNotFoundError) return { status: 404, body: { error: err.message } };
    throw err;
  }
}
