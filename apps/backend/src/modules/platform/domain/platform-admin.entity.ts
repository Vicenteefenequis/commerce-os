export class InvalidPlatformAdminError extends Error {}

export interface PlatformAdminProps {
  id: string;
  email: string;
  passwordHash: string;
}

/** Platform owner identity, not scoped to any Organization (spec: foundation/platform-admin). */
export class PlatformAdmin {
  private constructor(private readonly props: PlatformAdminProps) {}

  static create(props: PlatformAdminProps): PlatformAdmin {
    if (!props.email.includes("@")) {
      throw new InvalidPlatformAdminError("email must be a valid email address");
    }
    if (!props.passwordHash) {
      throw new InvalidPlatformAdminError("passwordHash is required");
    }
    return new PlatformAdmin(props);
  }

  get id(): string {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }
}
