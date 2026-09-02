export class InvalidVenueError extends Error {}

export interface VenueProps {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
}

/** Physical establishment belonging to an Organization (spec: foundation/venue). */
export class Venue {
  private constructor(private readonly props: VenueProps) {}

  static create(props: VenueProps): Venue {
    if (!props.name || props.name.trim().length === 0) {
      throw new InvalidVenueError("name is required");
    }
    if (!props.slug || props.slug.trim().length === 0) {
      throw new InvalidVenueError("slug is required");
    }
    return new Venue(props);
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }
}
