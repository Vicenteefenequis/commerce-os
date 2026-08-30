/**
 * Row Level Security is bypassed by table owners (unless FORCE) and is
 * ALWAYS bypassed by superusers, regardless of FORCE ROW LEVEL SECURITY.
 * The official postgres Docker image makes POSTGRES_USER the initdb
 * superuser, so the migration role itself can never be the role the
 * application connects as, or RLS is silently void (found via manual
 * verification against a running stack - see design.md D4 note).
 *
 * This migration creates a dedicated, non-superuser `app_user` role that
 * the backend and outbox-worker connect as. Migrations keep running as
 * the privileged role so they can create roles/run DDL.
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  const appPassword = (process.env.APP_DB_PASSWORD || "commerce_os_app").replace(/'/g, "''");

  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user LOGIN PASSWORD '${appPassword}';
      END IF;
    END
    $$;
  `);
  // Keep the password in sync if APP_DB_PASSWORD changes and migrations rerun.
  pgm.sql(`ALTER ROLE app_user PASSWORD '${appPassword}';`);
  pgm.sql(`ALTER ROLE app_user NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;`);

  pgm.sql(`GRANT USAGE ON SCHEMA public TO app_user;`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;`);
  pgm.sql(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;`,
  );
};

exports.down = (pgm) => {
  pgm.sql(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM app_user;`);
  pgm.sql(`DROP ROLE IF EXISTS app_user;`);
};
