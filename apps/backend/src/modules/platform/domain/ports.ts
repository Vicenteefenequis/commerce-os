import type { PlatformAdmin } from "./platform-admin.entity.js";
import type { PlatformSession } from "./platform-session.entity.js";

export interface PlatformAdminRepositoryPort {
  findByEmail(email: string): Promise<PlatformAdmin | null>;
  findById(id: string): Promise<PlatformAdmin | null>;
}

export interface PlatformSessionRepositoryPort {
  create(session: { adminId: string; expiresAt: Date }): Promise<PlatformSession>;
  findById(sessionId: string): Promise<PlatformSession | null>;
  revoke(sessionId: string): Promise<void>;
}

/** Sets the transaction-local `app.tenant_id` once a tenant becomes known mid-request (e.g. right after its Organization is created). */
export interface TenantContextPort {
  setTenantId(tenantId: string): Promise<void>;
}
