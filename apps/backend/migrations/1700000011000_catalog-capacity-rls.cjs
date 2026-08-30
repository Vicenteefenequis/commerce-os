/**
 * Row Level Security for the catalog/capacity tables added in this
 * change, following the same pattern as
 * 1700000006000_row-level-security.cjs (see that file for the rationale:
 * defense-in-depth tenant isolation, INV-001).
 */

const TABLES = [
  "products",
  "product_variants",
  "resources",
  "resource_capacity_periods",
  "resource_capacity_commitments",
];

exports.shorthands = undefined;

exports.up = (pgm) => {
  for (const table of TABLES) {
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
  for (const table of TABLES) {
    pgm.sql(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table};`);
    pgm.sql(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`);
  }
};
