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
  findById(tenantId: string, id: string): Promise<Entitlement | null>;
  /**
   * Atomically transitions `issued -> consumed`, returning whether this
   * caller is the one that performed it. `false` means the Entitlement was
   * not `issued` any more - either already consumed, or consumed by a
   * concurrent scan that got there first (spec: ticketing/entitlement -
   * "Concurrent scans on the same Entitlement resolve to a single
   * consumption"; add-access-control design.md D5).
   */
  consume(tenantId: string, id: string): Promise<boolean>;
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
  /**
   * Resolves a scanned code to its Ticket (spec: access/scan - "Ticket code
   * resolves to its Entitlement without granting access"). Scoped by tenant
   * so a code from another Organization is indistinguishable from an
   * unknown one.
   */
  findByCode(tenantId: string, code: string): Promise<Ticket | null>;
  /** spec: ticketing/ticket - "Ticket code can be rendered as a QR image". */
  findById(tenantId: string, id: string): Promise<Ticket | null>;
}
