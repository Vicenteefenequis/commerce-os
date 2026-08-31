import { randomUUID } from "node:crypto";
import type { OrderRepositoryPort } from "../../commerce/domain/ports.js";
import { OrderNotFoundError } from "../../commerce/application/order-errors.js";
import { generateTicketCode } from "../domain/generate-ticket-code.js";
import type { Entitlement } from "../domain/entitlement.entity.js";
import type { Ticket } from "../domain/ticket.entity.js";
import type { EntitlementRepositoryPort, TicketRepositoryPort } from "../domain/ports.js";

export interface IssueEntitlementsForOrderInput {
  tenantId: string;
  orderId: string;
}

export interface IssueEntitlementsForOrderResult {
  /** false when Entitlements already existed for this Order (idempotent no-op) - spec: "Entitlement issuance is not duplicated". */
  issued: boolean;
  entitlements: Entitlement[];
  tickets: Ticket[];
}

/**
 * spec: ticketing/entitlement - "Entitlement is issued one per purchased
 * unit", "Entitlement issuance is triggered by payment", "Entitlement
 * issuance is not duplicated"; ticketing/ticket - "Ticket is issued one
 * per Entitlement". Called from the commerce order.status_changed outbox
 * consumer once an Order reaches `paid` (design.md - Decisions).
 */
export class IssueEntitlementsForOrderUseCase {
  constructor(
    private readonly orders: OrderRepositoryPort,
    private readonly entitlements: EntitlementRepositoryPort,
    private readonly tickets: TicketRepositoryPort,
  ) {}

  async execute(input: IssueEntitlementsForOrderInput): Promise<IssueEntitlementsForOrderResult> {
    const existing = await this.entitlements.findByOrderId(input.tenantId, input.orderId);
    if (existing.length > 0) {
      const tickets = await this.tickets.findByEntitlementIds(
        input.tenantId,
        existing.map((e) => e.id),
      );
      return { issued: false, entitlements: existing, tickets };
    }

    const order = await this.orders.findById(input.tenantId, input.orderId);
    if (!order) throw new OrderNotFoundError();

    const entitlements: Entitlement[] = [];
    const tickets: Ticket[] = [];

    for (const line of order.lines) {
      for (let i = 0; i < line.quantity; i++) {
        const entitlement = await this.entitlements.create({
          id: randomUUID(),
          tenantId: input.tenantId,
          orderId: order.id,
          orderLineId: line.id,
          customerId: order.customerId,
        });
        entitlements.push(entitlement);

        const ticket = await this.tickets.create({
          id: randomUUID(),
          tenantId: input.tenantId,
          entitlementId: entitlement.id,
          code: generateTicketCode(),
        });
        tickets.push(ticket);
      }
    }

    return { issued: true, entitlements, tickets };
  }
}
