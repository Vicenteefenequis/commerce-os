exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("organization_configuration", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    tenant_id: {
      type: "uuid",
      notNull: true,
      references: "organizations",
      onDelete: "cascade",
    },
    key: { type: "text", notNull: true },
    value: { type: "text", notNull: true },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("organization_configuration", "tenant_id");
  pgm.addConstraint("organization_configuration", "org_configuration_tenant_key_unique", {
    unique: ["tenant_id", "key"],
  });
};

exports.down = (pgm) => {
  pgm.dropTable("organization_configuration");
};
