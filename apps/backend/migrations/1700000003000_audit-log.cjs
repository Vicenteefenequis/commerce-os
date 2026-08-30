exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("audit_log", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    tenant_id: {
      type: "uuid",
      notNull: true,
      references: "organizations",
      onDelete: "cascade",
    },
    actor_user_id: { type: "uuid", notNull: true, references: "users" },
    action: { type: "text", notNull: true },
    entity_type: { type: "text", notNull: true },
    entity_id: { type: "uuid" },
    metadata: { type: "jsonb", notNull: true, default: "{}" },
    // Source outbox event id, used to dedupe redelivered events (INV-005).
    event_id: { type: "uuid", notNull: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("audit_log", "tenant_id");
  pgm.addConstraint("audit_log", "audit_log_event_id_unique", { unique: ["event_id"] });
};

exports.down = (pgm) => {
  pgm.dropTable("audit_log");
};
