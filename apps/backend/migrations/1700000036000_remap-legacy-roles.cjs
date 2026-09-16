/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

/**
 * openspec change add-venue-scoped-user-roles, design.md Migration Plan:
 * cutover from the old seven roles to the new four, before the next
 * migration tightens `role_assignments`'s CHECK constraint to only allow
 * them.
 *
 * `owner`/`admin` become `admin` (org-wide, venue_id stays null - they
 * already carry no Venue). Every other legacy role
 * (`finance`/`sales`/`operator`/`access_operator`/`read_only`) has no
 * Venue-scope equivalent that can be inferred safely from existing data,
 * so those rows are archived (not silently dropped) into
 * `legacy_role_assignments_archive` and removed from `role_assignments`.
 * The affected users lose admin access until an Admin re-assigns them to
 * Gerente/Vendedor/Validador with an explicit Venue via the new Usuários
 * screen (foundation/user-management) - flagged in the release notes.
 */
exports.up = (pgm) => {
  pgm.createTable("legacy_role_assignments_archive", {
    id: { type: "uuid", primaryKey: true },
    tenant_id: { type: "uuid", notNull: true },
    user_id: { type: "uuid", notNull: true },
    role: { type: "text", notNull: true },
    created_at: { type: "timestamptz", notNull: true },
    archived_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });

  pgm.sql(`
    INSERT INTO legacy_role_assignments_archive (id, tenant_id, user_id, role, created_at)
    SELECT id, tenant_id, user_id, role, created_at
    FROM role_assignments
    WHERE role NOT IN ('owner', 'admin');
  `);

  pgm.sql(`DELETE FROM role_assignments WHERE role NOT IN ('owner', 'admin');`);
  pgm.sql(`UPDATE role_assignments SET role = 'admin' WHERE role = 'owner';`);

  // RLS, same pattern as audit_log (1700000006000_row-level-security.cjs):
  // tenant isolation on an audit-style table.
  pgm.sql(`ALTER TABLE legacy_role_assignments_archive ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE legacy_role_assignments_archive FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`
    CREATE POLICY legacy_role_assignments_archive_tenant_isolation ON legacy_role_assignments_archive
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
  `);
};

// Not meaningfully reversible: down would have to know which rows were
// remapped from 'owner' vs. created as 'admin' directly, and which
// archived rows to restore.
exports.down = () => {};
