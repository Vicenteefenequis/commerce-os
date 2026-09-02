/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

/**
 * add-platform-admin-console design.md - "A separate `platform` module
 * with its own tables": platform admins are not scoped to any Organization
 * (tenant), so these tables deliberately have no tenant_id and no RLS -
 * unlike users/sessions/role_assignments, which are all tenant-bound.
 */
exports.up = (pgm) => {
  pgm.createTable("platform_admins", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    email: { type: "citext", notNull: true, unique: true },
    password_hash: { type: "text", notNull: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });

  pgm.createTable("platform_sessions", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    admin_id: {
      type: "uuid",
      notNull: true,
      references: "platform_admins",
      onDelete: "cascade",
    },
    expires_at: { type: "timestamptz", notNull: true },
    revoked_at: { type: "timestamptz" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("platform_sessions", "admin_id");
};

exports.down = (pgm) => {
  pgm.dropTable("platform_sessions");
  pgm.dropTable("platform_admins");
};
