import type { EntitlementRepositoryPort, TicketRepositoryPort } from "../domain/ports.js";
import type { Ticket } from "../domain/ticket.entity.js";

export interface ListOrderTicketsInput {
  tenantId: string;
  orderId: string;
}

/**
 * spec: ticketing/ticket - "Tickets for a paid Order can be listed
 * account-less". Composes existing reads rather than a new join query:
 * Entitlements are only issued once an Order reaches `paid` (spec:
 * ticketing/entitlement), so an unpaid or nonexistent Order naturally
 * yields no Entitlements and therefore no Tickets - no separate status
 * check is needed. Tenant scoping is enforced by both repositories'
 * own RLS-backed filters, so a wrong tenantId resolves to an empty
 * list exactly like an unknown Order id.
 */
export class ListOrderTicketsUseCase {
  constructor(
    private readonly entitlements: EntitlementRepositoryPort,
    private readonly tickets: TicketRepositoryPort,
  ) {}

  async execute(input: ListOrderTicketsInput): Promise<Ticket[]> {
    const entitlements = await this.entitlements.findByOrderId(input.tenantId, input.orderId);
    if (entitlements.length === 0) return [];

    return this.tickets.findByEntitlementIds(
      input.tenantId,
      entitlements.map((entitlement) => entitlement.id),
    );
  }
}
