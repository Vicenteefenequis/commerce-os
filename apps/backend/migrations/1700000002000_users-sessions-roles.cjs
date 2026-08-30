exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createExtension("citext", { ifNotExists: true });

  pgm.createTable("users", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    tenant_id: {
      type: "uuid",
      notNull: true,
      references: "organizations",
      onDelete: "cascade",
    },
    email: { type: "citext", notNull: true },
    password_hash: { type: "text", notNull: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("users", "tenant_id");
  pgm.addConstraint("users", "users_tenant_email_unique", {
    unique: ["tenant_id", "email"],
  });

  pgm.createTable("role_assignments", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    tenant_id: {
      type: "uuid",
      notNull: true,
      references: "organizations",
      onDelete: "cascade",
    },
    user_id: { type: "uuid", notNull: true, references: "users", onDelete: "cascade" },
    role: {
      type: "text",
      notNull: true,
      check:
        "role in ('owner','admin','finance','sales','operator','access_operator','read_only')",
    },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("role_assignments", "tenant_id");
  pgm.createIndex("role_assignments", ["tenant_id", "user_id"]);

  pgm.createTable("sessions", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    tenant_id: {
      type: "uuid",
      notNull: true,
      references: "organizations",
      onDelete: "cascade",
    },
    user_id: { type: "uuid", notNull: true, references: "users", onDelete: "cascade" },
    expires_at: { type: "timestamptz", notNull: true },
    revoked_at: { type: "timestamptz" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("sessions", "tenant_id");
};

exports.down = (pgm) => {
  pgm.dropTable("sessions");
  pgm.dropTable("role_assignments");
  pgm.dropTable("users");
};
