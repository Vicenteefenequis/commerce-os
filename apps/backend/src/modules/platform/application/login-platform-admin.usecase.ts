import type { PlatformSession } from "../domain/platform-session.entity.js";
import type {
  PlatformAdminRepositoryPort,
  PlatformSessionRepositoryPort,
} from "../domain/ports.js";
import type { PasswordHasherPort } from "../../identity/domain/ports.js";

export class InvalidPlatformCredentialsError extends Error {
  constructor() {
    super("invalid email or password");
  }
}

export interface LoginPlatformAdminInput {
  email: string;
  password: string;
}

/** foundation/platform-admin - "Platform admin authentication". No tenantId: this actor is not scoped to any Organization. */
export class LoginPlatformAdminUseCase {
  constructor(
    private readonly admins: PlatformAdminRepositoryPort,
    private readonly sessions: PlatformSessionRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly sessionTtlSeconds: number,
  ) {}

  async execute(input: LoginPlatformAdminInput): Promise<PlatformSession> {
    const admin = await this.admins.findByEmail(input.email);
    if (!admin) {
      throw new InvalidPlatformCredentialsError();
    }

    const passwordMatches = await this.passwordHasher.verify(input.password, admin.passwordHash);
    if (!passwordMatches) {
      throw new InvalidPlatformCredentialsError();
    }

    const expiresAt = new Date(Date.now() + this.sessionTtlSeconds * 1000);
    return this.sessions.create({ adminId: admin.id, expiresAt });
  }
}
