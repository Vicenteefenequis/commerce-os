import type { PlatformSessionRepositoryPort } from "../domain/ports.js";

/** Immediate platform session revocation, mirroring identity's LogoutUseCase. */
export class LogoutPlatformAdminUseCase {
  constructor(private readonly sessions: PlatformSessionRepositoryPort) {}

  async execute(sessionId: string): Promise<void> {
    await this.sessions.revoke(sessionId);
  }
}
