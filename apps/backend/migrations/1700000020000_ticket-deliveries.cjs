/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

/**
 * spec: communication/ticket-delivery. One row per delivery attempt for
 * an Order's Tickets; `status` records the outcome, including
 * `not_configured` when no EmailProviderPort adapter is wired
 * (design.md - EmailProviderPort has no real provider yet).
 */
exports.up = (pgm) => {
  pgm.createTable("ticket_deliveries", {
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
    status: { type: "text", notNull: true },
    attempted_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("ticket_deliveries", "tenant_id");
  pgm.createIndex("ticket_deliveries", "order_id");
  pgm.addConstraint("ticket_deliveries", "ticket_deliveries_status_valid", {
    check: "status IN ('sent', 'failed', 'not_configured')",
  });

  pgm.sql(`ALTER TABLE ticket_deliveries ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE ticket_deliveries FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`
    CREATE POLICY ticket_deliveries_tenant_isolation ON ticket_deliveries
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP POLICY IF EXISTS ticket_deliveries_tenant_isolation ON ticket_deliveries;`);
  pgm.sql(`ALTER TABLE ticket_deliveries DISABLE ROW LEVEL SECURITY;`);
  pgm.dropTable("ticket_deliveries");
};
