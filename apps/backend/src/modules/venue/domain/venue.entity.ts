export class InvalidVenueError extends Error {}

export interface VenueProfile {
  description?: string | null;
  address?: string | null;
  city?: string | null;
  category?: string | null;
  coverPhotoUrl?: string | null;
}

export interface VenueProps extends VenueProfile {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  /** Owner-controlled inclusion in `storefront/discovery` search (spec: foundation/venue - "Venue publish toggle is owner-controlled"). Defaults to unpublished. */
  published?: boolean;
}

export function isWellFormedUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
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
    if (props.coverPhotoUrl && !isWellFormedUrl(props.coverPhotoUrl)) {
      throw new InvalidVenueError("coverPhotoUrl must be a well-formed URL");
    }
    return new Venue({ ...props, published: props.published ?? false });
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

  get description(): string | null {
    return this.props.description ?? null;
  }

  get address(): string | null {
    return this.props.address ?? null;
  }

  get city(): string | null {
    return this.props.city ?? null;
  }

  get category(): string | null {
    return this.props.category ?? null;
  }

  get coverPhotoUrl(): string | null {
    return this.props.coverPhotoUrl ?? null;
  }

  get published(): boolean {
    return this.props.published ?? false;
  }
}
