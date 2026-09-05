export class InvalidVenueError extends Error {}

export interface VenueProfile {
  description?: string | null;
  address?: string | null;
  city?: string | null;
  category?: string | null;
  coverPhotoUrl?: string | null;
  /** Owner-editable location (spec: foundation/venue - "Venue location coordinates are owner-editable"). Valid range: [-90, 90]. */
  latitude?: number | null;
  /** Valid range: [-180, 180]. */
  longitude?: number | null;
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
    if (
      props.latitude !== undefined &&
      props.latitude !== null &&
      (props.latitude < -90 || props.latitude > 90)
    ) {
      throw new InvalidVenueError("latitude must be between -90 and 90");
    }
    if (
      props.longitude !== undefined &&
      props.longitude !== null &&
      (props.longitude < -180 || props.longitude > 180)
    ) {
      throw new InvalidVenueError("longitude must be between -180 and 180");
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

  get latitude(): number | null {
    return this.props.latitude ?? null;
  }

  get longitude(): number | null {
    return this.props.longitude ?? null;
  }
}
