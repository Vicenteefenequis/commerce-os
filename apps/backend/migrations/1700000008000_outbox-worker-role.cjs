/**
 * The outbox worker must scan for pending events ACROSS ALL TENANTS (it
 * doesn't know in advance which tenant has pending work - that's what the
 * scan is for), but the tenant_isolation policy on outbox_events requires
 * app.tenant_id to already match, which is impossible before the row is
 * even read. Found via manual verification: the worker's poll/NOTIFY loop
 * silently returned zero rows forever under app_user.
 *
 * Fix: a dedicated, least-privilege `outbox_worker_user` role with an
 * ADDITIONAL permissive policy scoped to just that role (Postgres
 * combines multiple permissive policies with OR), so only the worker gets
 * cross-tenant visibility into outbox_events - app_user (the HTTP
 * backend) keeps strict tenant-scoped access via the existing policy.
 *
 * The policy must be FOR ALL, not just SELECT: `SELECT ... FOR UPDATE`
 * under RLS also evaluates the UPDATE-applicable USING clause of every
 * policy on the table (locking implies update-intent), so a SELECT-only
 * permissive policy still left rows silently filtered out of `FOR UPDATE
 * SKIP LOCKED` before app.tenant_id was set (found via manual
 * verification - `count(*)` saw the rows, `FOR UPDATE SKIP LOCKED` saw
 * none). The worker's own UPDATE later still runs after it sets
 * app.tenant_id to the row's own tenant (see
 * src/worker/process-pending-events.ts), so that write stays correctly
 * tenant-scoped in practice even though this policy would also permit it.
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  const workerPassword = (process.env.OUTBOX_DB_PASSWORD || "commerce_os_outbox").replace(
    /'/g,
    "''",
  );

  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'outbox_worker_user') THEN
        CREATE ROLE outbox_worker_user LOGIN PASSWORD '${workerPassword}';
      END IF;
    END
    $$;
  `);
  pgm.sql(`ALTER ROLE outbox_worker_user PASSWORD '${workerPassword}';`);
  pgm.sql(
    `ALTER ROLE outbox_worker_user NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;`,
  );

  pgm.sql(`GRANT USAGE ON SCHEMA public TO outbox_worker_user;`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO outbox_worker_user;`);
  pgm.sql(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO outbox_worker_user;`,
  );

  pgm.sql(`
    CREATE POLICY outbox_events_worker_scan ON outbox_events
    FOR ALL
    TO outbox_worker_user
    USING (true)
    WITH CHECK (true);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP POLICY IF EXISTS outbox_events_worker_scan ON outbox_events;`);
  pgm.sql(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM outbox_worker_user;`);
  pgm.sql(`DROP ROLE IF EXISTS outbox_worker_user;`);
};
