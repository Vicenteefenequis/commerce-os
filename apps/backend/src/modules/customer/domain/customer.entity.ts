export class InvalidCustomerError extends Error {}

export interface CustomerProps {
  id: string;
  tenantId: string;
  email: string;
  name: string;
}

/** A buyer's minimal, tenant-scoped identity, captured at checkout without requiring an account (spec: customer/customer). */
export class Customer {
  private constructor(private readonly props: CustomerProps) {}

  static create(props: CustomerProps): Customer {
    if (!props.email || props.email.trim().length === 0) {
      throw new InvalidCustomerError("email is required");
    }
    if (!props.name || props.name.trim().length === 0) {
      throw new InvalidCustomerError("name is required");
    }
    return new Customer(props);
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

  get name(): string {
    return this.props.name;
  }
}
