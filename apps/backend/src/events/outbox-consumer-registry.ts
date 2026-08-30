import type { Trx } from "../http/tx-route.js";

export interface OutboxEventRecord {
  id: string;
  tenantId: string;
  type: string;
  payload: Record<string, unknown>;
}

export type OutboxConsumer = (event: OutboxEventRecord, trx: Trx) => Promise<void>;

const consumers = new Map<string, OutboxConsumer[]>();

/** Registers a handler to run for every outbox event of the given type. */
export function registerOutboxConsumer(eventType: string, consumer: OutboxConsumer): void {
  const existing = consumers.get(eventType) ?? [];
  existing.push(consumer);
  consumers.set(eventType, existing);
}

export function getOutboxConsumersFor(eventType: string): OutboxConsumer[] {
  return consumers.get(eventType) ?? [];
}
