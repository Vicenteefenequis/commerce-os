/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

/**
 * spec: ticketing/entitlement, ticketing/ticket. One Entitlement per
 * purchased unit (design.md - "One Entitlement per unit, not one
 * Entitlement with an amount"), each backed by exactly one Ticket
 * carrying a globally-unique code. `entitlements.status` only allows
 * `issued` for now - Access Control (M5) will extend it with
 * `consumed`/`void` when it lands.
 */
exports.up = (pgm) => {
  pgm.createTable("entitlements", {
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
    order_line_id: {
      type: "uuid",
      notNull: true,
      references: "order_lines",
      onDelete: "cascade",
    },
    customer_id: {
      type: "uuid",
      notNull: true,
      references: "customers",
      onDelete: "restrict",
    },
    status: { type: "text", notNull: true, default: "issued" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("entitlements", "tenant_id");
  pgm.createIndex("entitlements", "order_id");
  pgm.addConstraint("entitlements", "entitlements_status_valid", {
    check: "status IN ('issued')",
  });

  pgm.createTable("tickets", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    tenant_id: {
      type: "uuid",
      notNull: true,
      references: "organizations",
      onDelete: "cascade",
    },
    entitlement_id: {
      type: "uuid",
      notNull: true,
      references: "entitlements",
      onDelete: "cascade",
    },
    code: { type: "text", notNull: true },
    issued_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("tickets", "tenant_id");
  // Globally unique, not per-tenant (spec: ticketing/ticket - "Ticket codes
  // do not collide" - across tenants too).
  pgm.createIndex("tickets", "code", { unique: true });
  // Entitlement:Ticket is 1:1 (design.md decision).
  pgm.createIndex("tickets", "entitlement_id", { unique: true });

  for (const table of ["entitlements", "tickets"]) {
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
  for (const table of ["tickets", "entitlements"]) {
    pgm.sql(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table};`);
    pgm.sql(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`);
  }
  pgm.dropTable("tickets");
  pgm.dropTable("entitlements");
};
