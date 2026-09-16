import type { Request } from "express";
import type { Trx, TxResult } from "../../../http/tx-route.js";
import { KyselyVenueRepository } from "../../venue/infrastructure/venue-repository.kysely.js";
import { ListUsersUseCase } from "../application/list-users.usecase.js";
import {
  AssignmentVenueNotFoundError,
  CreateRoleAssignmentUseCase,
  InvalidRoleAssignmentError,
  InvalidRoleError,
  UserNotFoundError,
} from "../application/create-role-assignment.usecase.js";
import { RevokeRoleAssignmentUseCase } from "../application/revoke-role-assignment.usecase.js";
import { KyselyUserManagementRepository } from "./user-management-repository.kysely.js";
import type { UserWithAssignments } from "../domain/ports.js";

function serializeUser(user: UserWithAssignments) {
  return {
    userId: user.userId,
    email: user.email,
    assignments: user.assignments.map((a) => ({ id: a.id, role: a.role, venueId: a.venueId })),
  };
}

/** spec: foundation/user-management - "Admin lists the organization's users". */
export async function listUsersController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const users = await new ListUsersUseCase(new KyselyUserManagementRepository(trx)).execute(
    identity.tenantId,
  );
  return { status: 200, body: { users: users.map(serializeUser) } };
}

/**
 * spec: foundation/user-management - "Role assignment specifies a role
 * and, when required, a Venue", "A user can hold multiple role
 * assignments".
 */
export async function createRoleAssignmentController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const { userId, role, venueId } = req.body as {
    userId?: string;
    role?: string;
    venueId?: string | null;
  };
  if (!userId || !role) {
    return { status: 400, body: { error: "userId and role are required" } };
  }

  const useCase = new CreateRoleAssignmentUseCase(
    new KyselyUserManagementRepository(trx),
    new KyselyVenueRepository(trx),
  );

  try {
    const assignment = await useCase.execute({
      tenantId: identity.tenantId,
      userId,
      role,
      venueId: venueId ?? null,
    });
    return { status: 201, body: assignment };
  } catch (err) {
    if (err instanceof InvalidRoleError || err instanceof InvalidRoleAssignmentError) {
      return { status: 400, body: { error: err.message } };
    }
    if (err instanceof UserNotFoundError || err instanceof AssignmentVenueNotFoundError) {
      return { status: 404, body: { error: err.message } };
    }
    throw err;
  }
}

/**
 * spec: foundation/user-management - "Revoking a role assignment takes
 * effect immediately".
 */
export async function revokeRoleAssignmentController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const { assignmentId } = req.params as { assignmentId: string };
  const revoked = await new RevokeRoleAssignmentUseCase(
    new KyselyUserManagementRepository(trx),
  ).execute(identity.tenantId, assignmentId);

  if (!revoked) {
    return { status: 404, body: { error: "role assignment not found" } };
  }
  return { status: 204 };
}
