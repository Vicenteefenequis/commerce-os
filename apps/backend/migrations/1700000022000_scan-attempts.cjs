/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

/**
 * spec: access/scan - "Every scan attempt is recorded". Append-only log of
 * every entry attempt, authorized or denied (add-access-control design.md
 * D6), so the door has an audit trail independent of the Entitlement's own
 * status.
 *
 * `entitlement_id` is nullable because an unknown/malformed code resolves
 * to no Entitlement at all and still has to be recorded; it is `SET NULL`
 * on delete so purging an Order never erases the fact that a scan
 * happened. `venue_id` is the Venue the operator selected for the scanning
 * session (D1 - it is a request parameter, not an identity attribute), and
 * `ticket_code` keeps the raw scanned value even when nothing matched it.
 */
exports.up = (pgm) => {
  pgm.createTable("scan_attempts", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    tenant_id: {
      type: "uuid",
      notNull: true,
      references: "organizations",
      onDelete: "cascade",
    },
    entitlement_id: {
      type: "uuid",
      references: "entitlements",
      onDelete: "set null",
    },
    ticket_code: { type: "text", notNull: true },
    venue_id: {
      type: "uuid",
      notNull: true,
      references: "venues",
      onDelete: "cascade",
    },
    outcome: { type: "text", notNull: true },
    scanned_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("scan_attempts", "tenant_id");
  pgm.createIndex("scan_attempts", "entitlement_id");
  pgm.createIndex("scan_attempts", ["tenant_id", "scanned_at"]);
  pgm.addConstraint("scan_attempts", "scan_attempts_outcome_valid", {
    check: "outcome IN ('authorized', 'already_used', 'invalid', 'wrong_venue', 'wrong_time', 'expired')",
  });

  // RLS, same pattern as 1700000019000_ticketing.cjs (defense in depth, INV-001).
  pgm.sql(`ALTER TABLE scan_attempts ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE scan_attempts FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`
    CREATE POLICY scan_attempts_tenant_isolation ON scan_attempts
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP POLICY IF EXISTS scan_attempts_tenant_isolation ON scan_attempts;`);
  pgm.sql(`ALTER TABLE scan_attempts DISABLE ROW LEVEL SECURITY;`);
  pgm.dropTable("scan_attempts");
};
