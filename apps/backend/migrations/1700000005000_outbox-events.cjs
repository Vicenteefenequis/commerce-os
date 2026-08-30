exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("outbox_events", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    tenant_id: {
      type: "uuid",
      notNull: true,
      references: "organizations",
      onDelete: "cascade",
    },
    event_type: { type: "text", notNull: true },
    payload: { type: "jsonb", notNull: true, default: "{}" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    processed_at: { type: "timestamptz" },
  });
  pgm.createIndex("outbox_events", "tenant_id");
  pgm.createIndex("outbox_events", "processed_at");

  // Wake the outbox worker via LISTEN/NOTIFY instead of polling on an
  // interval (design.md D6). The payload only carries a wakeup signal -
  // the worker always re-queries pending rows, so a missed/truncated
  // NOTIFY only adds latency, never data loss (design.md Risks).
  pgm.sql(`
    CREATE OR REPLACE FUNCTION notify_outbox_event() RETURNS trigger AS $$
    BEGIN
      PERFORM pg_notify('outbox_events_channel', 'new_event');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
    CREATE TRIGGER outbox_events_notify
    AFTER INSERT ON outbox_events
    FOR EACH ROW
    EXECUTE FUNCTION notify_outbox_event();
  `);
};

exports.down = (pgm) => {
  pgm.sql("DROP TRIGGER IF EXISTS outbox_events_notify ON outbox_events;");
  pgm.sql("DROP FUNCTION IF EXISTS notify_outbox_event;");
  pgm.dropTable("outbox_events");
};
