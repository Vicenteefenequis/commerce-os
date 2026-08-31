/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

// Leads are prospective establishments, not onboarded tenants, so this
// table intentionally has no tenant_id and no RLS (design.md - lead
// storage decision).
exports.up = (pgm) => {
  pgm.createTable("leads", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    establishment_name: { type: "text", notNull: true },
    email: { type: "text", notNull: true },
    business_type: { type: "text", notNull: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("leads");
};
