import type { Session } from "./session.entity.js";
import type { User } from "./user.entity.js";

export interface PasswordHasherPort {
  hash(plainPassword: string): Promise<string>;
  verify(plainPassword: string, passwordHash: string): Promise<boolean>;
}

export interface UserRepositoryPort {
  findByTenantAndEmail(tenantId: string, email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(user: { tenantId: string; email: string; passwordHash: string }): Promise<User>;
}

export interface SessionRepositoryPort {
  create(session: { tenantId: string; userId: string; expiresAt: Date }): Promise<Session>;
  findById(sessionId: string): Promise<Session | null>;
  revoke(sessionId: string): Promise<void>;
}
