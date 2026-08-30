import type { Session } from "../domain/session.entity.js";
import type {
  PasswordHasherPort,
  SessionRepositoryPort,
  UserRepositoryPort,
} from "../domain/ports.js";

export class InvalidCredentialsError extends Error {
  constructor() {
    super("invalid email or password");
  }
}

export interface LoginInput {
  tenantId: string;
  email: string;
  password: string;
}

/**
 * IAM-001: authenticates an administrative user and creates a server-side
 * session. Login is scoped to a known tenant (organization) - the caller
 * (e.g. a tenant-specific login page/subdomain) supplies tenantId, so this
 * use-case never needs to look a user up across tenants.
 */
export class LoginUseCase {
  constructor(
    private readonly users: UserRepositoryPort,
    private readonly sessions: SessionRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly sessionTtlSeconds: number,
  ) {}

  async execute(input: LoginInput): Promise<Session> {
    const user = await this.users.findByTenantAndEmail(input.tenantId, input.email);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await this.passwordHasher.verify(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    const expiresAt = new Date(Date.now() + this.sessionTtlSeconds * 1000);
    return this.sessions.create({ tenantId: user.tenantId, userId: user.id, expiresAt });
  }
}
