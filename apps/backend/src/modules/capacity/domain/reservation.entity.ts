export class InvalidReservationError extends Error {}

export type ReservationStatus = "pending" | "confirmed" | "expired" | "cancelled" | "consumed";

export interface ReservationProps {
  id: string;
  tenantId: string;
  resourceId: string;
  period: string;
  amount: number;
  status: ReservationStatus;
  commitmentId: string;
  expiresAt: Date;
}

/**
 * Retention or planned consumption of a Resource's capacity by a
 * specific request, with an explicit lifecycle (spec: capacity/reservation).
 */
export class Reservation {
  private constructor(private readonly props: ReservationProps) {}

  static create(props: ReservationProps): Reservation {
    if (!Number.isInteger(props.amount) || props.amount <= 0) {
      throw new InvalidReservationError("amount must be a positive integer");
    }
    return new Reservation(props);
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get resourceId(): string {
    return this.props.resourceId;
  }

  get period(): string {
    return this.props.period;
  }

  get amount(): number {
    return this.props.amount;
  }

  get status(): ReservationStatus {
    return this.props.status;
  }

  get commitmentId(): string {
    return this.props.commitmentId;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }
}
