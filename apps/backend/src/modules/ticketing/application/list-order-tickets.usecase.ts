import type { EntitlementRepositoryPort, ReservationValidityLookupPort, TicketRepositoryPort } from "../domain/ports.js";
import type { Ticket } from "../domain/ticket.entity.js";
import type { OrderRepositoryPort } from "../../commerce/domain/ports.js";
import type { OrganizationRepositoryPort } from "../../organization/domain/ports.js";
import type { ProductRepositoryPort } from "../../catalog/domain/ports.js";
import type { CustomerRepositoryPort } from "../../customer/domain/ports.js";
import { reservationPeriodBounds } from "../../access/domain/scan-time-window.js";

export interface ListOrderTicketsInput {
  tenantId: string;
  orderId: string;
}

export interface TicketValidityWindow {
  start: Date;
  end: Date;
}

/** spec: ticketing/ticket - "Listed ticket includes display context". */
export interface TicketWithDisplayContext {
  ticket: Ticket;
  organizationName: string;
  organizationSlug: string;
  offerName: string;
  loteName: string;
  buyerName: string;
  validity: TicketValidityWindow | null;
}

/**
 * spec: ticketing/ticket - "Tickets for a paid Order can be listed
 * account-less". Composes existing reads rather than a new join query:
 * Entitlements are only issued once an Order reaches `paid` (spec:
 * ticketing/entitlement), so an unpaid or nonexistent Order naturally
 * yields no Entitlements and therefore no Tickets - no separate status
 * check is needed. Tenant scoping is enforced by every injected
 * repository's own RLS-backed filters, so a wrong tenantId resolves to an
 * empty list exactly like an unknown Order id.
 *
 * Display context (design.md D2) is assembled from data the Order and its
 * lines already snapshot at purchase time (the buyer, the lote's name,
 * the Reservation backing a line) plus the tenant's Organization and the
 * offer's live Product name - one Order read, one Organization read, one
 * Customer read, and a per-distinct-variant catalog lookup, not a
 * per-Ticket fan-out.
 */
export class ListOrderTicketsUseCase {
  constructor(
    private readonly entitlements: EntitlementRepositoryPort,
    private readonly tickets: TicketRepositoryPort,
    private readonly orders: OrderRepositoryPort,
    private readonly organizations: OrganizationRepositoryPort,
    private readonly products: ProductRepositoryPort,
    private readonly customers: CustomerRepositoryPort,
    private readonly reservationValidity: ReservationValidityLookupPort,
  ) {}

  async execute(input: ListOrderTicketsInput): Promise<TicketWithDisplayContext[]> {
    const entitlements = await this.entitlements.findByOrderId(input.tenantId, input.orderId);
    if (entitlements.length === 0) return [];

    const tickets = await this.tickets.findByEntitlementIds(
      input.tenantId,
      entitlements.map((entitlement) => entitlement.id),
    );
    if (tickets.length === 0) return [];

    const order = await this.orders.findById(input.tenantId, input.orderId);
    if (!order) return [];

    const [organization, customer] = await Promise.all([
      this.organizations.findById(input.tenantId),
      this.customers.findById(input.tenantId, order.customerId),
    ]);

    const entitlementById = new Map(entitlements.map((entitlement) => [entitlement.id, entitlement]));
    const lineById = new Map(order.lines.map((line) => [line.id, line]));
    const offerNameByVariantId = new Map<string, string>();

    const results: TicketWithDisplayContext[] = [];
    for (const ticket of tickets) {
      const entitlement = entitlementById.get(ticket.entitlementId);
      const line = entitlement ? lineById.get(entitlement.orderLineId) : undefined;
      if (!entitlement || !line) continue;

      let offerName = offerNameByVariantId.get(line.variantId);
      if (offerName === undefined) {
        const variant = await this.products.findVariantById(input.tenantId, line.variantId);
        const product = variant ? await this.products.findById(input.tenantId, variant.productId) : null;
        offerName = product?.name ?? "";
        offerNameByVariantId.set(line.variantId, offerName);
      }

      let validity: TicketValidityWindow | null = null;
      if (line.reservationId) {
        const period = await this.reservationValidity.findPeriodByReservationId(input.tenantId, line.reservationId);
        validity = period ? reservationPeriodBounds(period) : null;
      }

      results.push({
        ticket,
        organizationName: organization?.name ?? "",
        organizationSlug: organization?.slug ?? "",
        offerName,
        loteName: line.name,
        buyerName: customer?.name ?? "",
        validity,
      });
    }
    return results;
  }
}
