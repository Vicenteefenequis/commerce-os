import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { RecordAuditEntryUseCase } from "./record-audit-entry.usecase.js";
import { AuditEntry, MissingAuditActorError } from "../domain/audit-entry.entity.js";
import type { AuditRepositoryPort } from "../domain/ports.js";

class FakeAuditRepository implements AuditRepositoryPort {
  public recorded: AuditEntry[] = [];
  async existsForEvent(eventId: string): Promise<boolean> {
    return this.recorded.some((entry) => entry.eventId === eventId);
  }
  async record(entry: AuditEntry): Promise<void> {
    this.recorded.push(entry);
  }
}

describe("RecordAuditEntryUseCase", () => {
  const tenantId = randomUUID();

  it("records an audit entry for a sensitive operation", async () => {
    const repo = new FakeAuditRepository();
    const useCase = new RecordAuditEntryUseCase(repo);

    await useCase.execute({
      tenantId,
      actorUserId: randomUUID(),
      action: "configuration.changed",
      entityType: "organization_configuration",
      entityId: null,
      metadata: { key: "checkout.enabled", value: "true" },
      eventId: randomUUID(),
    });

    expect(repo.recorded).toHaveLength(1);
  });

  it("does not duplicate an entry when the same event is delivered twice", async () => {
    const repo = new FakeAuditRepository();
    const useCase = new RecordAuditEntryUseCase(repo);
    const eventId = randomUUID();
    const input = {
      tenantId,
      actorUserId: randomUUID(),
      action: "configuration.changed",
      entityType: "organization_configuration",
      entityId: null,
      metadata: {},
      eventId,
    };

    await useCase.execute(input);
    await useCase.execute(input);

    expect(repo.recorded).toHaveLength(1);
  });

  it("rejects an entry without an identifiable actor", () => {
    expect(() =>
      AuditEntry.create({
        tenantId,
        actorUserId: "",
        action: "configuration.changed",
        entityType: "organization_configuration",
        entityId: null,
        metadata: {},
        eventId: randomUUID(),
      }),
    ).toThrow(MissingAuditActorError);
  });
});
