import type { ColumnType, Generated } from "kysely";

type Timestamp = ColumnType<Date, Date | string, Date | string>;

export interface OrganizationsTable {
  id: Generated<string>;
  name: string;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface VenuesTable {
  id: Generated<string>;
  tenant_id: string;
  name: string;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface UsersTable {
  id: Generated<string>;
  tenant_id: string;
  email: string;
  password_hash: string;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface RoleAssignmentsTable {
  id: Generated<string>;
  tenant_id: string;
  user_id: string;
  role: string;
  created_at: Generated<Timestamp>;
}

export interface SessionsTable {
  id: Generated<string>;
  tenant_id: string;
  user_id: string;
  expires_at: Timestamp;
  revoked_at: Timestamp | null;
  created_at: Generated<Timestamp>;
}

export interface OrganizationConfigurationTable {
  id: Generated<string>;
  tenant_id: string;
  key: string;
  value: string;
  updated_at: Generated<Timestamp>;
}

type Jsonb<T> = ColumnType<T, T, T>;

export interface AuditLogTable {
  id: Generated<string>;
  tenant_id: string;
  actor_user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Jsonb<Record<string, unknown>>;
  event_id: string;
  created_at: Generated<Timestamp>;
}

export interface OutboxEventsTable {
  id: Generated<string>;
  tenant_id: string;
  event_type: string;
  payload: Jsonb<Record<string, unknown>>;
  created_at: Generated<Timestamp>;
  processed_at: Timestamp | null;
}

export interface ProductsTable {
  id: Generated<string>;
  tenant_id: string;
  venue_id: string;
  name: string;
  available_from: Timestamp | null;
  available_until: Timestamp | null;
  channels: Generated<string[]>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface ProductVariantsTable {
  id: Generated<string>;
  tenant_id: string;
  product_id: string;
  name: string;
  price_cents: number;
  resource_id: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface ResourcesTable {
  id: Generated<string>;
  tenant_id: string;
  venue_id: string;
  name: string;
  default_capacity: number;
  hard_capacity: Generated<boolean>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface ResourceCapacityPeriodsTable {
  id: Generated<string>;
  tenant_id: string;
  resource_id: string;
  period: ColumnType<string, string, string>;
  capacity: number;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export type ResourceCapacityCommitmentStatus = "held" | "consumed" | "released";

export interface ResourceCapacityCommitmentsTable {
  id: Generated<string>;
  tenant_id: string;
  resource_id: string;
  period: ColumnType<string, string, string>;
  amount: number;
  status: ResourceCapacityCommitmentStatus;
  created_at: Generated<Timestamp>;
}

export interface LeadsTable {
  id: Generated<string>;
  establishment_name: string;
  email: string;
  business_type: string;
  created_at: Generated<Timestamp>;
}

export type ReservationStatus = "pending" | "confirmed" | "expired" | "cancelled" | "consumed";

export interface ReservationsTable {
  id: Generated<string>;
  tenant_id: string;
  resource_id: string;
  period: ColumnType<string, string, string>;
  amount: number;
  status: ReservationStatus;
  commitment_id: string;
  expires_at: Timestamp;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface CustomersTable {
  id: Generated<string>;
  tenant_id: string;
  email: string;
  name: string;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export type OrderStatus =
  | "draft"
  | "awaiting_payment"
  | "paid"
  | "fulfilled"
  | "partially_refunded"
  | "refunded"
  | "cancelled"
  | "expired";

export interface OrdersTable {
  id: Generated<string>;
  tenant_id: string;
  venue_id: string;
  customer_id: string;
  status: OrderStatus;
  idempotency_key: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface OrderLinesTable {
  id: Generated<string>;
  tenant_id: string;
  order_id: string;
  variant_id: string;
  name: string;
  unit_price_cents: number;
  quantity: number;
  reservation_id: string | null;
  created_at: Generated<Timestamp>;
}

export interface OrderStatusHistoryTable {
  id: Generated<string>;
  tenant_id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  actor_user_id: string | null;
  created_at: Generated<Timestamp>;
}

export type PaymentStatus = "pending" | "succeeded" | "failed" | "partially_refunded" | "refunded";

export interface PaymentsTable {
  id: Generated<string>;
  tenant_id: string;
  order_id: string;
  provider: string;
  provider_payment_id: string;
  method: string;
  status: PaymentStatus;
  amount_cents: number;
  currency: string;
  refunded_amount_cents: Generated<number>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface PaymentEventsTable {
  id: Generated<string>;
  tenant_id: string;
  payment_id: string | null;
  provider_event_id: string;
  type: string;
  processed_at: Generated<Timestamp>;
}

export interface PaymentStatusHistoryTable {
  id: Generated<string>;
  tenant_id: string;
  payment_id: string;
  from_status: PaymentStatus | null;
  to_status: PaymentStatus;
  amount_cents: number;
  actor_user_id: string | null;
  cause: string;
  created_at: Generated<Timestamp>;
}

export type EntitlementStatus = "issued" | "consumed";

export interface EntitlementsTable {
  id: Generated<string>;
  tenant_id: string;
  order_id: string;
  order_line_id: string;
  customer_id: string;
  status: Generated<EntitlementStatus>;
  created_at: Generated<Timestamp>;
}

export interface TicketsTable {
  id: Generated<string>;
  tenant_id: string;
  entitlement_id: string;
  code: string;
  issued_at: Generated<Timestamp>;
}

export type TicketDeliveryStatus = "sent" | "failed" | "not_configured";

export interface TicketDeliveriesTable {
  id: Generated<string>;
  tenant_id: string;
  order_id: string;
  status: TicketDeliveryStatus;
  attempted_at: Generated<Timestamp>;
}

export type ScanOutcome = "authorized" | "already_used" | "invalid" | "wrong_venue" | "wrong_time" | "expired";

export interface ScanAttemptsTable {
  id: Generated<string>;
  tenant_id: string;
  /** Null when the scanned code matched no Ticket at all (spec: access/scan - "Unknown or malformed code"). */
  entitlement_id: string | null;
  ticket_code: string;
  venue_id: string;
  outcome: ScanOutcome;
  /**
   * Database-defaulted, but written explicitly by the scan flow so the row
   * carries the same instant the outcome was decided against - hence
   * `undefined` (use the default) rather than `Generated<Timestamp>`,
   * which would forbid supplying a value.
   */
  scanned_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export interface Database {
  organizations: OrganizationsTable;
  venues: VenuesTable;
  users: UsersTable;
  role_assignments: RoleAssignmentsTable;
  sessions: SessionsTable;
  organization_configuration: OrganizationConfigurationTable;
  audit_log: AuditLogTable;
  outbox_events: OutboxEventsTable;
  products: ProductsTable;
  product_variants: ProductVariantsTable;
  resources: ResourcesTable;
  resource_capacity_periods: ResourceCapacityPeriodsTable;
  resource_capacity_commitments: ResourceCapacityCommitmentsTable;
  leads: LeadsTable;
  reservations: ReservationsTable;
  customers: CustomersTable;
  orders: OrdersTable;
  order_lines: OrderLinesTable;
  order_status_history: OrderStatusHistoryTable;
  payments: PaymentsTable;
  payment_events: PaymentEventsTable;
  payment_status_history: PaymentStatusHistoryTable;
  entitlements: EntitlementsTable;
  tickets: TicketsTable;
  ticket_deliveries: TicketDeliveriesTable;
  scan_attempts: ScanAttemptsTable;
}
