import { describe, expect, it } from "vitest";
import { SubmitLeadUseCase } from "./submit-lead.usecase.js";
import { Lead, InvalidLeadError } from "../domain/lead.entity.js";
import type { LeadRepositoryPort } from "../domain/ports.js";

class FakeLeadRepository implements LeadRepositoryPort {
  public created: Lead | null = null;
  async create(lead: { id: string; establishmentName: string; email: string; businessType: string }): Promise<Lead> {
    this.created = Lead.create(lead);
    return this.created;
  }
}

describe("SubmitLeadUseCase", () => {
  it("persists a valid lead", async () => {
    const repo = new FakeLeadRepository();
    const useCase = new SubmitLeadUseCase(repo);

    const lead = await useCase.execute({
      establishmentName: "Zoo Municipal",
      email: "contato@zoo.example",
      businessType: "zoologico",
    });

    expect(lead.establishmentName).toBe("Zoo Municipal");
    expect(repo.created).toBe(lead);
  });

  it("rejects a missing establishment name without persisting", async () => {
    const repo = new FakeLeadRepository();
    const useCase = new SubmitLeadUseCase(repo);

    await expect(
      useCase.execute({ establishmentName: "", email: "contato@zoo.example", businessType: "zoologico" }),
    ).rejects.toBeInstanceOf(InvalidLeadError);
    expect(repo.created).toBeNull();
  });

  it("rejects a malformed email without persisting", async () => {
    const repo = new FakeLeadRepository();
    const useCase = new SubmitLeadUseCase(repo);

    await expect(
      useCase.execute({ establishmentName: "Zoo Municipal", email: "not-an-email", businessType: "zoologico" }),
    ).rejects.toBeInstanceOf(InvalidLeadError);
    expect(repo.created).toBeNull();
  });

  it("rejects a missing business type without persisting", async () => {
    const repo = new FakeLeadRepository();
    const useCase = new SubmitLeadUseCase(repo);

    await expect(
      useCase.execute({ establishmentName: "Zoo Municipal", email: "contato@zoo.example", businessType: "" }),
    ).rejects.toBeInstanceOf(InvalidLeadError);
    expect(repo.created).toBeNull();
  });
});
