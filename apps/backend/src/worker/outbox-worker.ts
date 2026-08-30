import { Client } from "pg";
import { env } from "../config/env.js";
import { registerAllConsumers } from "./register-consumers.js";
import { processPendingEvents } from "./process-pending-events.js";

const NOTIFY_CHANNEL = "outbox_events_channel";
// Coarse safety net (design.md Risks): if a NOTIFY is ever missed (no
// listener at the moment it fires, dropped connection, etc.), this bounds
// how long an event can sit unprocessed to this interval instead of forever.
const POLL_INTERVAL_MS = Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 10_000);

async function drain(reason: string): Promise<void> {
  try {
    const processed = await processPendingEvents();
    if (processed > 0) {
      console.log(`[outbox-worker] processed ${processed} event(s) (trigger: ${reason})`);
    }
  } catch (err) {
    console.error("[outbox-worker] failed processing pending events", err);
  }
}

async function main(): Promise<void> {
  registerAllConsumers();

  const listenClient = new Client({ connectionString: env.databaseUrl });
  await listenClient.connect();
  await listenClient.query(`LISTEN ${NOTIFY_CHANNEL}`);

  listenClient.on("notification", () => {
    void drain("notify");
  });

  listenClient.on("error", (err) => {
    console.error("[outbox-worker] LISTEN connection error", err);
  });

  const pollTimer = setInterval(() => void drain("poll"), POLL_INTERVAL_MS);

  console.log(`[outbox-worker] listening on "${NOTIFY_CHANNEL}", polling every ${POLL_INTERVAL_MS}ms`);
  await drain("startup");

  const shutdown = async () => {
    clearInterval(pollTimer);
    await listenClient.end();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown());
  process.on("SIGINT", () => void shutdown());
}

main().catch((err) => {
  console.error("[outbox-worker] fatal error", err);
  process.exit(1);
});
