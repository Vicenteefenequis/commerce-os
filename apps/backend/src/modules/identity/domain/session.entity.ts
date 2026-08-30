export class Session {
  private constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly userId: string,
    public readonly expiresAt: Date,
    public readonly revokedAt: Date | null,
  ) {}

  static create(props: {
    id: string;
    tenantId: string;
    userId: string;
    expiresAt: Date;
    revokedAt: Date | null;
  }): Session {
    return new Session(props.id, props.tenantId, props.userId, props.expiresAt, props.revokedAt);
  }

  isValid(now: Date): boolean {
    if (this.revokedAt !== null) return false;
    return this.expiresAt.getTime() > now.getTime();
  }
}
