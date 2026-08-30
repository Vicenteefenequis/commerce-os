export class InvalidResourceError extends Error {}

export interface ResourceProps {
  id: string;
  tenantId: string;
  venueId: string;
  name: string;
  defaultCapacity: number;
  hardCapacity: boolean;
}

/** Something whose capacity must be managed (spec: capacity/resource). */
export class Resource {
  private constructor(private readonly props: ResourceProps) {}

  static create(props: ResourceProps): Resource {
    if (!props.name || props.name.trim().length === 0) {
      throw new InvalidResourceError("name is required");
    }
    if (!Number.isInteger(props.defaultCapacity) || props.defaultCapacity < 0) {
      throw new InvalidResourceError("defaultCapacity must be a non-negative integer");
    }
    return new Resource(props);
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get venueId(): string {
    return this.props.venueId;
  }

  get name(): string {
    return this.props.name;
  }

  get defaultCapacity(): number {
    return this.props.defaultCapacity;
  }

  get hardCapacity(): boolean {
    return this.props.hardCapacity;
  }
}
