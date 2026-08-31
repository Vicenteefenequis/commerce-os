/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

/**
 * spec: payments/payment. design.md: payments (one row per Payment
 * attempt, at most one active per Order - enforced in the application
 * layer, not a DB constraint, since a failed Payment stays in the table);
 * payment_events (webhook idempotency ledger, PAY-003); payment_status_history
 * (financial audit trail, PAY-006), mirroring order_status_history's shape.
 */
exports.up = (pgm) => {
  pgm.createTable("payments", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    tenant_id: {
      type: "uuid",
      notNull: true,
      references: "organizations",
      onDelete: "cascade",
    },
    order_id: {
      type: "uuid",
      notNull: true,
      references: "orders",
      onDelete: "restrict",
    },
    provider: { type: "text", notNull: true },
    provider_payment_id: { type: "text", notNull: true },
    method: { type: "text", notNull: true },
    status: { type: "text", notNull: true, default: "pending" },
    amount_cents: { type: "integer", notNull: true },
    currency: { type: "text", notNull: true },
    refunded_amount_cents: { type: "integer", notNull: true, default: 0 },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("payments", "tenant_id");
  pgm.createIndex("payments", "order_id");
  pgm.addConstraint("payments", "payments_status_valid", {
    check: "status IN ('pending', 'succeeded', 'failed', 'partially_refunded', 'refunded')",
  });
  pgm.addConstraint("payments", "payments_method_valid", {
    check: "method IN ('card', 'pix')",
  });
  pgm.addConstraint("payments", "payments_amount_positive", {
    check: "amount_cents > 0",
  });
  pgm.addConstraint("payments", "payments_refunded_amount_valid", {
    check: "refunded_amount_cents >= 0 AND refunded_amount_cents <= amount_cents",
  });

  pgm.createTable("payment_events", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    tenant_id: {
      type: "uuid",
      notNull: true,
      references: "organizations",
      onDelete: "cascade",
    },
    payment_id: {
      type: "uuid",
      references: "payments",
      onDelete: "set null",
    },
    provider_event_id: { type: "text", notNull: true },
    type: { type: "text", notNull: true },
    processed_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("payment_events", "tenant_id");
  pgm.createIndex("payment_events", ["tenant_id", "provider_event_id"], { unique: true });

  pgm.createTable("payment_status_history", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    tenant_id: {
      type: "uuid",
      notNull: true,
      references: "organizations",
      onDelete: "cascade",
    },
    payment_id: {
      type: "uuid",
      notNull: true,
      references: "payments",
      onDelete: "cascade",
    },
    from_status: { type: "text" },
    to_status: { type: "text", notNull: true },
    amount_cents: { type: "integer", notNull: true },
    actor_user_id: {
      type: "uuid",
      references: "users",
      onDelete: "set null",
    },
    cause: { type: "text", notNull: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("payment_status_history", "tenant_id");
  pgm.createIndex("payment_status_history", "payment_id");

  // RLS, same pattern as 1700000015000_orders.cjs (defense in depth, INV-001).
  for (const table of ["payments", "payment_events", "payment_status_history"]) {
    pgm.sql(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
    pgm.sql(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`);
    pgm.sql(`
      CREATE POLICY ${table}_tenant_isolation ON ${table}
      USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
    `);
  }
};

exports.down = (pgm) => {
  for (const table of ["payment_status_history", "payment_events", "payments"]) {
    pgm.sql(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table};`);
    pgm.sql(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`);
  }
  pgm.dropTable("payment_status_history");
  pgm.dropTable("payment_events");
  pgm.dropTable("payments");
};
