/** No tenantId: a platform session is deliberately not scoped to any Organization. */
export class PlatformSession {
  private constructor(
    public readonly id: string,
    public readonly adminId: string,
    public readonly expiresAt: Date,
    public readonly revokedAt: Date | null,
  ) {}

  static create(props: {
    id: string;
    adminId: string;
    expiresAt: Date;
    revokedAt: Date | null;
  }): PlatformSession {
    return new PlatformSession(props.id, props.adminId, props.expiresAt, props.revokedAt);
  }

  isValid(now: Date): boolean {
    if (this.revokedAt !== null) return false;
    return this.expiresAt.getTime() > now.getTime();
  }
}
