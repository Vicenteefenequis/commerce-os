import type { Entitlement } from "./entitlement.entity.js";
import type { Ticket } from "./ticket.entity.js";

export interface CreateEntitlementInput {
  id: string;
  tenantId: string;
  orderId: string;
  orderLineId: string;
  customerId: string;
}

export interface EntitlementRepositoryPort {
  create(input: CreateEntitlementInput): Promise<Entitlement>;
  /** Used to make issuance idempotent (spec: "Entitlement issuance is not duplicated"). */
  findByOrderId(tenantId: string, orderId: string): Promise<Entitlement[]>;
}

export interface CreateTicketInput {
  id: string;
  tenantId: string;
  entitlementId: string;
  code: string;
}

export interface TicketRepositoryPort {
  create(input: CreateTicketInput): Promise<Ticket>;
  findByEntitlementIds(tenantId: string, entitlementIds: string[]): Promise<Ticket[]>;
}
