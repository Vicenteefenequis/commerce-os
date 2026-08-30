import type { SessionRepositoryPort } from "../domain/ports.js";

export interface ResolvedSession {
  userId: string;
  tenantId: string;
}

/** Resolves a session cookie value to a known identity, or null if invalid/expired/revoked. */
export class ResolveSessionIdentityUseCase {
  constructor(private readonly sessions: SessionRepositoryPort) {}

  async execute(sessionId: string, now: Date = new Date()): Promise<ResolvedSession | null> {
    const session = await this.sessions.findById(sessionId);
    if (!session || !session.isValid(now)) {
      return null;
    }
    return { userId: session.userId, tenantId: session.tenantId };
  }
}
