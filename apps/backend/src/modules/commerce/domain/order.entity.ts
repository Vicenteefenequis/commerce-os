export class InvalidOrderError extends Error {}

export type OrderStatus =
  | "draft"
  | "awaiting_payment"
  | "paid"
  | "fulfilled"
  | "partially_refunded"
  | "refunded"
  | "cancelled"
  | "expired";

export interface OrderLineProps {
  id: string;
  orderId: string;
  tenantId: string;
  variantId: string;
  /** Snapshot of the variant's name at order creation time (spec: commerce/order - "Order snapshots commercial terms at creation"). */
  name: string;
  /** Snapshot of the variant's price at order creation time, independent of later price changes. */
  unitPriceCents: number;
  quantity: number;
  /** Reservation backing this line's capacity hold, or null when the variant holds no capacity. */
  reservationId?: string | null;
}

/** A purchased line within an Order, carrying its own commercial-terms snapshot. */
export class OrderLine {
  private constructor(private readonly props: OrderLineProps) {}

  static create(props: OrderLineProps): OrderLine {
    if (!props.name || props.name.trim().length === 0) {
      throw new InvalidOrderError("line name is required");
    }
    if (!Number.isInteger(props.unitPriceCents) || props.unitPriceCents < 0) {
      throw new InvalidOrderError("line unitPriceCents must be a non-negative integer");
    }
    if (!Number.isInteger(props.quantity) || props.quantity <= 0) {
      throw new InvalidOrderError("line quantity must be a positive integer");
    }
    return new OrderLine(props);
  }

  get id(): string {
    return this.props.id;
  }

  get orderId(): string {
    return this.props.orderId;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get variantId(): string {
    return this.props.variantId;
  }

  get name(): string {
    return this.props.name;
  }

  get unitPriceCents(): number {
    return this.props.unitPriceCents;
  }

  get quantity(): number {
    return this.props.quantity;
  }

  get reservationId(): string | null {
    return this.props.reservationId ?? null;
  }

  get totalCents(): number {
    return this.unitPriceCents * this.quantity;
  }
}

export interface OrderProps {
  id: string;
  tenantId: string;
  venueId: string;
  customerId: string;
  status: OrderStatus;
  idempotencyKey?: string | null;
  lines: OrderLine[];
}

/**
 * A customer's purchase, with an explicit lifecycle and a commercial-terms
 * snapshot independent of later catalog changes (spec: commerce/order).
 */
export class Order {
  private constructor(private readonly props: OrderProps) {}

  static create(props: OrderProps): Order {
    if (props.lines.length === 0) {
      throw new InvalidOrderError("at least one line is required");
    }
    if (!props.customerId) {
      throw new InvalidOrderError("customerId is required");
    }
    return new Order(props);
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

  get customerId(): string {
    return this.props.customerId;
  }

  get status(): OrderStatus {
    return this.props.status;
  }

  get idempotencyKey(): string | null {
    return this.props.idempotencyKey ?? null;
  }

  get lines(): OrderLine[] {
    return this.props.lines;
  }

  get totalCents(): number {
    return this.lines.reduce((sum, line) => sum + line.totalCents, 0);
  }
}
