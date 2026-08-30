export class InvalidConfigurationError extends Error {}

export interface OrganizationConfigurationProps {
  tenantId: string;
  key: string;
  value: string;
}

/** Per-organization setting (spec: foundation/configuration). */
export class OrganizationConfiguration {
  private constructor(private readonly props: OrganizationConfigurationProps) {}

  static create(props: OrganizationConfigurationProps): OrganizationConfiguration {
    if (!props.key || props.key.trim().length === 0) {
      throw new InvalidConfigurationError("key is required");
    }
    return new OrganizationConfiguration(props);
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get key(): string {
    return this.props.key;
  }

  get value(): string {
    return this.props.value;
  }
}
