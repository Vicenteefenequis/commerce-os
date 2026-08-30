import type { SessionRepositoryPort } from "../domain/ports.js";

/** Immediate session revocation (spec: foundation/identity - Session revocation). */
export class LogoutUseCase {
  constructor(private readonly sessions: SessionRepositoryPort) {}

  async execute(sessionId: string): Promise<void> {
    await this.sessions.revoke(sessionId);
  }
}
