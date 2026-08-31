/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

/**
 * spec: commerce/order, commerce/checkout. design.md: idempotency_key
 * de-dupes retried checkout submissions (CHK-005); order_status_history is
 * an append-only log mirroring the audit pattern already used for
 * reservations (ORD-002).
 */
exports.up = (pgm) => {
  pgm.createTable("orders", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    tenant_id: {
      type: "uuid",
      notNull: true,
      references: "organizations",
      onDelete: "cascade",
    },
    venue_id: {
      type: "uuid",
      notNull: true,
      references: "venues",
      onDelete: "cascade",
    },
    status: { type: "text", notNull: true, default: "draft" },
    idempotency_key: { type: "text" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("orders", "tenant_id");
  pgm.createIndex("orders", ["tenant_id", "idempotency_key"], {
    unique: true,
    where: "idempotency_key IS NOT NULL",
  });
  pgm.addConstraint("orders", "orders_status_valid", {
    check:
      "status IN ('draft', 'awaiting_payment', 'paid', 'fulfilled', 'partially_refunded', 'refunded', 'cancelled', 'expired')",
  });

  pgm.createTable("order_lines", {
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
      onDelete: "cascade",
    },
    variant_id: {
      type: "uuid",
      notNull: true,
      references: "product_variants",
      onDelete: "restrict",
    },
    name: { type: "text", notNull: true },
    unit_price_cents: { type: "integer", notNull: true },
    quantity: { type: "integer", notNull: true },
    reservation_id: {
      type: "uuid",
      references: "reservations",
      onDelete: "set null",
    },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("order_lines", "tenant_id");
  pgm.createIndex("order_lines", "order_id");
  pgm.addConstraint("order_lines", "order_lines_quantity_positive", {
    check: "quantity > 0",
  });
  pgm.addConstraint("order_lines", "order_lines_price_non_negative", {
    check: "unit_price_cents >= 0",
  });

  pgm.createTable("order_status_history", {
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
      onDelete: "cascade",
    },
    from_status: { type: "text" },
    to_status: { type: "text", notNull: true },
    actor_user_id: {
      type: "uuid",
      references: "users",
      onDelete: "set null",
    },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("order_status_history", "tenant_id");
  pgm.createIndex("order_status_history", "order_id");

  // RLS, same pattern as 1700000013000_reservations.cjs (defense in
  // depth, INV-001).
  for (const table of ["orders", "order_lines", "order_status_history"]) {
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
  for (const table of ["order_status_history", "order_lines", "orders"]) {
    pgm.sql(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table};`);
    pgm.sql(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`);
  }
  pgm.dropTable("order_status_history");
  pgm.dropTable("order_lines");
  pgm.dropTable("orders");
};
