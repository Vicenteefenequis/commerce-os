/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

/**
 * spec: capacity/reservation. A Reservation references the
 * resource_capacity_commitments row it holds (design.md D1): the
 * commitment ledger already answers "does this count toward committed
 * capacity" (held/consumed/released), Reservation answers the business
 * question of has-payment-been-confirmed/has-the-customer-entered.
 */
exports.up = (pgm) => {
  pgm.createTable("reservations", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    tenant_id: {
      type: "uuid",
      notNull: true,
      references: "organizations",
      onDelete: "cascade",
    },
    resource_id: {
      type: "uuid",
      notNull: true,
      references: "resources",
      onDelete: "cascade",
    },
    period: { type: "date", notNull: true },
    amount: { type: "integer", notNull: true },
    status: { type: "text", notNull: true, default: "pending" },
    commitment_id: {
      type: "uuid",
      notNull: true,
      references: "resource_capacity_commitments",
      onDelete: "cascade",
    },
    expires_at: { type: "timestamptz", notNull: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("reservations", "tenant_id");
  pgm.createIndex("reservations", ["resource_id", "period"]);
  pgm.addConstraint("reservations", "reservations_amount_positive", {
    check: "amount > 0",
  });
  pgm.addConstraint("reservations", "reservations_status_valid", {
    check: "status IN ('pending', 'confirmed', 'expired', 'cancelled', 'consumed')",
  });

  // RLS, same pattern as 1700000011000_catalog-capacity-rls.cjs (defense
  // in depth, INV-001).
  pgm.sql(`ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE reservations FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`
    CREATE POLICY reservations_tenant_isolation ON reservations
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP POLICY IF EXISTS reservations_tenant_isolation ON reservations;`);
  pgm.sql(`ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;`);
  pgm.dropTable("reservations");
};
