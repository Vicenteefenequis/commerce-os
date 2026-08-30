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
}
