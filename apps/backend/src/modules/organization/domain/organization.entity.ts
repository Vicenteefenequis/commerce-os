export class InvalidOrganizationError extends Error {}

export interface OrganizationProps {
  id: string;
  name: string;
  slug: string;
}

/** Tenant boundary of the platform (spec: foundation/organization). */
export class Organization {
  private constructor(private readonly props: OrganizationProps) {}

  static create(props: OrganizationProps): Organization {
    if (!props.name || props.name.trim().length === 0) {
      throw new InvalidOrganizationError("name is required");
    }
    if (!props.slug || props.slug.trim().length === 0) {
      throw new InvalidOrganizationError("slug is required");
    }
    return new Organization(props);
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }
}
