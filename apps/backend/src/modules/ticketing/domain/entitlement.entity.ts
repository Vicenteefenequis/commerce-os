export class InvalidEntitlementError extends Error {}

export type EntitlementStatus = "issued" | "consumed";

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
 * ticketing/entitlement). `consumed` is terminal and is only ever reached
 * through the Access Control scan flow (spec: ticketing/entitlement -
 * "Entitlement is consumed exactly once via Access Control"); there is no
 * multi-use ticket in this MVP (add-access-control design.md - Non-Goals).
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

  get isConsumed(): boolean {
    return this.props.status === "consumed";
  }

  /**
   * spec: ticketing/entitlement - "Consumed Entitlement rejects further
   * scans". Only an `issued` Entitlement can be consumed; the transition
   * is one-way and produces a new instance rather than mutating this one,
   * so a caller that failed to persist it never holds a value that
   * disagrees with the row.
   */
  consume(): Entitlement {
    if (this.props.status !== "issued") {
      throw new InvalidEntitlementError(`entitlement with status ${this.props.status} cannot be consumed`);
    }
    return new Entitlement({ ...this.props, status: "consumed" });
  }
}
