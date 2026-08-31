import type { Request } from "express";
import type { Trx, TxResult } from "../../../http/tx-route.js";
import { env } from "../../../config/env.js";
import { LoginUseCase, InvalidCredentialsError } from "../application/login.usecase.js";
import { LogoutUseCase } from "../application/logout.usecase.js";
import { Argon2PasswordHasher } from "./password-hasher.argon2.js";
import { KyselySessionRepository } from "./session-repository.kysely.js";
import { KyselyUserRepository } from "./user-repository.kysely.js";
import { clearedSessionCookieHeader, sessionCookieHeader, readSessionCookie } from "./cookie.js";
import { KyselyOrganizationRepository } from "../../organization/infrastructure/organization-repository.kysely.js";

const passwordHasher = new Argon2PasswordHasher();

export async function loginController(req: Request, trx: Trx): Promise<TxResult> {
  const { tenantId, email, password } = req.body as {
    tenantId?: string;
    email?: string;
    password?: string;
  };

  if (!tenantId || !email || !password) {
    return { status: 400, body: { error: "tenantId, email and password are required" } };
  }

  const useCase = new LoginUseCase(
    new KyselyUserRepository(trx),
    new KyselySessionRepository(trx),
    passwordHasher,
    env.sessionTtlSeconds,
  );

  try {
    const session = await useCase.execute({ tenantId, email, password });
    return {
      status: 200,
      body: { userId: session.userId },
      headers: { "Set-Cookie": sessionCookieHeader(session.id) },
    };
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      return { status: 401, body: { error: err.message } };
    }
    throw err;
  }
}

export async function meController(req: Request, trx: Trx): Promise<TxResult> {
  const { tenantId, userId, roles } = req.identity!;

  const [user, organization] = await Promise.all([
    new KyselyUserRepository(trx).findById(userId),
    new KyselyOrganizationRepository(trx).findById(tenantId),
  ]);

  return {
    status: 200,
    body: {
      tenantId,
      userId,
      roles,
      email: user?.email ?? null,
      organizationName: organization?.name ?? null,
    },
  };
}

export async function logoutController(req: Request, trx: Trx): Promise<TxResult> {
  const sessionId = readSessionCookie(req);
  if (sessionId) {
    const useCase = new LogoutUseCase(new KyselySessionRepository(trx));
    await useCase.execute(sessionId);
  }
  return { status: 204, headers: { "Set-Cookie": clearedSessionCookieHeader() } };
}
