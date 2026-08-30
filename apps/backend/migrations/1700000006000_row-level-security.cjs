/**
 * Row Level Security (design.md D4): defense-in-depth tenant isolation.
 * The application layer already requires tenant_id on every repository
 * call; these policies make isolation hold even if that filter is ever
 * missing due to an application bug (INV-001).
 *
 * Policies read the current tenant from a transaction-local session
 * variable set per-request (see src/http/tx-route.ts):
 *   SELECT set_config('app.tenant_id', '<uuid>', true)
 *
 * FORCE ROW LEVEL SECURITY is required because the migration/app role
 * owns these tables, and table owners bypass RLS by default otherwise.
 */

const TENANT_TABLES = [
  "venues",
  "role_assignments",
  "organization_configuration",
  "audit_log",
  "outbox_events",
];

exports.shorthands = undefined;

exports.up = (pgm) => {
  for (const table of TENANT_TABLES) {
    pgm.sql(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
    pgm.sql(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`);
    pgm.sql(`
      CREATE POLICY ${table}_tenant_isolation ON ${table}
      USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
    `);
  }

  // users: same isolation as the other tenant tables.
  pgm.sql(`ALTER TABLE users ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE users FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`
    CREATE POLICY users_tenant_isolation ON users
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
  `);

  // sessions: looked up by an unguessable random id BEFORE the tenant is
  // known (that lookup is how the tenant gets resolved in the first
  // place), so SELECT is allowed regardless of app.tenant_id - knowledge
  // of the session id is itself the credential, same as a bearer token.
  // Mutations (create/revoke) still require the tenant to match.
  pgm.sql(`ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE sessions FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`
    CREATE POLICY sessions_select_by_id ON sessions
    FOR SELECT
    USING (true);
  `);
  pgm.sql(`
    CREATE POLICY sessions_write_tenant_isolation ON sessions
    FOR INSERT
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
  `);
  pgm.sql(`
    CREATE POLICY sessions_update_tenant_isolation ON sessions
    FOR UPDATE
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
  `);
};

exports.down = (pgm) => {
  for (const table of TENANT_TABLES) {
    pgm.sql(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table};`);
    pgm.sql(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`);
  }
  pgm.sql(`DROP POLICY IF EXISTS users_tenant_isolation ON users;`);
  pgm.sql(`ALTER TABLE users DISABLE ROW LEVEL SECURITY;`);
  pgm.sql(`DROP POLICY IF EXISTS sessions_select_by_id ON sessions;`);
  pgm.sql(`DROP POLICY IF EXISTS sessions_write_tenant_isolation ON sessions;`);
  pgm.sql(`DROP POLICY IF EXISTS sessions_update_tenant_isolation ON sessions;`);
  pgm.sql(`ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;`);
};
