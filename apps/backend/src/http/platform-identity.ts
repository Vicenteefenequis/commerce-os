export interface PlatformIdentity {
  adminId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by resolvePlatformIdentity. No tenantId - deliberately not scoped to any Organization. */
      platformIdentity?: PlatformIdentity;
    }
  }
}
