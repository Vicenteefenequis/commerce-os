/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

/**
 * openspec change add-venue-scoped-user-roles, design.md D2: a role
 * assignment optionally binds a role to a single Venue. `venue_id IS NULL`
 * is only valid for the `admin` role (org-wide); `gerente`/`vendedor`/
 * `validador` assignments always carry a Venue. That "required unless
 * admin" rule can't be expressed as a DB check constraint alongside the FK,
 * so it's enforced in the application layer (foundation/user-management).
 *
 * The unique constraint prevents the same role from being assigned twice
 * to the same user for the same Venue (or twice org-wide for `admin`,
 * since Postgres treats each NULL venue_id as distinct from every other
 * NULL - acceptable here since creating a duplicate `admin` assignment is
 * a harmless no-op, not a security concern).
 */
exports.up = (pgm) => {
  pgm.addColumn("role_assignments", {
    venue_id: {
      type: "uuid",
      references: "venues",
      onDelete: "cascade",
    },
  });
  pgm.createIndex("role_assignments", "venue_id");
  pgm.addConstraint("role_assignments", "role_assignments_tenant_user_role_venue_unique", {
    unique: ["tenant_id", "user_id", "role", "venue_id"],
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint("role_assignments", "role_assignments_tenant_user_role_venue_unique");
  pgm.dropColumn("role_assignments", "venue_id");
};
