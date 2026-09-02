import type { Request } from "express";
import type { Trx, TxResult } from "../../../http/tx-route.js";
import { env } from "../../../config/env.js";
import {
  LoginPlatformAdminUseCase,
  InvalidPlatformCredentialsError,
} from "../application/login-platform-admin.usecase.js";
import { LogoutPlatformAdminUseCase } from "../application/logout-platform-admin.usecase.js";
import { Argon2PasswordHasher } from "../../identity/infrastructure/password-hasher.argon2.js";
import { KyselyPlatformAdminRepository } from "./platform-admin-repository.kysely.js";
import { KyselyPlatformSessionRepository } from "./platform-session-repository.kysely.js";
import {
  clearedPlatformSessionCookieHeader,
  platformSessionCookieHeader,
  readPlatformSessionCookie,
} from "./cookie.js";
import { Organization } from "../../organization/domain/organization.entity.js";

const passwordHasher = new Argon2PasswordHasher();

export async function platformLoginController(req: Request, trx: Trx): Promise<TxResult> {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return { status: 400, body: { error: "email and password are required" } };
  }

  const useCase = new LoginPlatformAdminUseCase(
    new KyselyPlatformAdminRepository(trx),
    new KyselyPlatformSessionRepository(trx),
    passwordHasher,
    env.sessionTtlSeconds,
  );

  try {
    const session = await useCase.execute({ email, password });
    return {
      status: 200,
      body: { adminId: session.adminId },
      headers: { "Set-Cookie": platformSessionCookieHeader(session.id) },
    };
  } catch (err) {
    if (err instanceof InvalidPlatformCredentialsError) {
      return { status: 401, body: { error: err.message } };
    }
    throw err;
  }
}

export async function platformLogoutController(req: Request, trx: Trx): Promise<TxResult> {
  const sessionId = readPlatformSessionCookie(req);
  if (sessionId) {
    const useCase = new LogoutPlatformAdminUseCase(new KyselyPlatformSessionRepository(trx));
    await useCase.execute(sessionId);
  }
  return { status: 204, headers: { "Set-Cookie": clearedPlatformSessionCookieHeader() } };
}

export async function listOrganizationsController(_req: Request, trx: Trx): Promise<TxResult> {
  const organizations = await trx.selectFrom("organizations").selectAll().execute();
  return {
    status: 200,
    body: {
      organizations: organizations.map((row) => {
        const organization = Organization.create({ id: row.id, name: row.name, slug: row.slug });
        return { id: organization.id, name: organization.name, slug: organization.slug };
      }),
    },
  };
}
