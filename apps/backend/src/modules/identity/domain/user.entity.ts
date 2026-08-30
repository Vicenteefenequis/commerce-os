export class InvalidUserError extends Error {}

export interface UserProps {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
}

/** Administrative user of a single Organization (IAM-001). */
export class User {
  private constructor(private readonly props: UserProps) {}

  static create(props: UserProps): User {
    if (!props.email.includes("@")) {
      throw new InvalidUserError("email must be a valid email address");
    }
    if (!props.passwordHash) {
      throw new InvalidUserError("passwordHash is required");
    }
    return new User(props);
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get email(): string {
    return this.props.email;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }
}
