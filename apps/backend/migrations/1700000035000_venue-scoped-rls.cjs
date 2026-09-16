/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

/**
 * openspec change add-venue-scoped-user-roles, design.md D3: adds a
 * Venue-scope restriction on top of the existing tenant-isolation
 * policies, without touching them. Postgres combines multiple PERMISSIVE
 * policies for the same command with OR, which would weaken isolation
 * here; a RESTRICTIVE policy instead ANDs with the existing permissive
 * tenant policy, so a row must satisfy both to be visible/writable.
 *
 * `app.venue_ids` is set by txRoute from the caller's resolved Identity
 * (see src/http/tx-route.ts and src/http/identity.ts): a comma-joined list
 * of Venue ids for a Gerente/Vendedor/Validador, or left unset/empty for
 * an Admin or for any route with no admin identity at all (public
 * storefront/checkout routes only ever set app.tenant_id, never
 * app.venue_ids). Both "never set" and "explicitly empty" mean
 * unrestricted - Venue scope is a narrowing applied only for identities
 * that actually carry one; every route still relies on the pre-existing
 * tenant policy for isolation.
 *
 * `venues` itself has no `venue_id` column - it IS the Venue - so its
 * restrictive policy checks `id` instead.
 */
const VENUE_ID_TABLES = [
  "products",
  "product_variants",
  "resources",
  "resource_capacity_periods",
  "resource_capacity_commitments",
  "reservations",
  "orders",
  "order_lines",
  "order_status_history",
  "entitlements",
  "tickets",
  "scan_attempts",
];

function venueScopeExpression(column) {
  return `(
    current_setting('app.venue_ids', true) IS NULL
    OR current_setting('app.venue_ids', true) = ''
    OR ${column} = ANY(string_to_array(current_setting('app.venue_ids', true), ',')::uuid[])
  )`;
}

exports.up = (pgm) => {
  const venuesExpr = venueScopeExpression("id");
  pgm.sql(`
    CREATE POLICY venues_venue_scope ON venues
    AS RESTRICTIVE
    USING (${venuesExpr})
    WITH CHECK (${venuesExpr});
  `);

  for (const table of VENUE_ID_TABLES) {
    const expr = venueScopeExpression("venue_id");
    pgm.sql(`
      CREATE POLICY ${table}_venue_scope ON ${table}
      AS RESTRICTIVE
      USING (${expr})
      WITH CHECK (${expr});
    `);
  }
};

exports.down = (pgm) => {
  for (const table of VENUE_ID_TABLES) {
    pgm.sql(`DROP POLICY IF EXISTS ${table}_venue_scope ON ${table};`);
  }
  pgm.sql(`DROP POLICY IF EXISTS venues_venue_scope ON venues;`);
};
