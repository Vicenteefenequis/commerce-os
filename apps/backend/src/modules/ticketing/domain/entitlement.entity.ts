export class InvalidEntitlementError extends Error {}

export type EntitlementStatus = "issued";

export interface EntitlementProps {
  id: string;
  tenantId: string;
  orderId: string;
  orderLineId: string;
  customerId: string;
  status: EntitlementStatus;
}

/**
 * A single purchased right of entry, issued 1:1 per purchased unit (spec:
 * ticketing/entitlement). Consumption (M5/Access Control) will extend
 * `status` beyond `issued`.
 */
export class Entitlement {
  private constructor(private readonly props: EntitlementProps) {}

  static create(props: EntitlementProps): Entitlement {
    if (!props.orderId) throw new InvalidEntitlementError("orderId is required");
    if (!props.orderLineId) throw new InvalidEntitlementError("orderLineId is required");
    if (!props.customerId) throw new InvalidEntitlementError("customerId is required");
    return new Entitlement(props);
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get orderId(): string {
    return this.props.orderId;
  }

  get orderLineId(): string {
    return this.props.orderLineId;
  }

  get customerId(): string {
    return this.props.customerId;
  }

  get status(): EntitlementStatus {
    return this.props.status;
  }
}
