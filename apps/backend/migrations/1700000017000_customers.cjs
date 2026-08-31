/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

/**
 * spec: customer/customer. A minimal, tenant-scoped buyer identity
 * captured at checkout, reused by email within a tenant (unique index on
 * (tenant_id, lower(email))).
 */
exports.up = (pgm) => {
  pgm.createTable("customers", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    tenant_id: {
      type: "uuid",
      notNull: true,
      references: "organizations",
      onDelete: "cascade",
    },
    email: { type: "text", notNull: true },
    name: { type: "text", notNull: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("customers", "tenant_id");
  pgm.sql(`
    CREATE UNIQUE INDEX customers_tenant_id_lower_email_idx
    ON customers (tenant_id, lower(email));
  `);

  // RLS, same pattern as 1700000015000_orders.cjs (defense in depth, INV-001).
  pgm.sql(`ALTER TABLE customers ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE customers FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`
    CREATE POLICY customers_tenant_isolation ON customers
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP POLICY IF EXISTS customers_tenant_isolation ON customers;`);
  pgm.sql(`ALTER TABLE customers DISABLE ROW LEVEL SECURITY;`);
  pgm.dropTable("customers");
};
