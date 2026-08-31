export class InvalidTicketError extends Error {}

export interface TicketProps {
  id: string;
  tenantId: string;
  entitlementId: string;
  code: string;
}

/**
 * The usable manifestation of an Entitlement (spec: ticketing/ticket) -
 * exactly one per Entitlement (design.md decision), carrying a
 * globally-unique code that a QR encodes. The code identifies which
 * Entitlement it manifests; it is not itself an authorization decision.
 */
export class Ticket {
  private constructor(private readonly props: TicketProps) {}

  static create(props: TicketProps): Ticket {
    if (!props.entitlementId) throw new InvalidTicketError("entitlementId is required");
    if (!props.code || props.code.trim().length === 0) throw new InvalidTicketError("code is required");
    return new Ticket(props);
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get entitlementId(): string {
    return this.props.entitlementId;
  }

  get code(): string {
    return this.props.code;
  }
}
