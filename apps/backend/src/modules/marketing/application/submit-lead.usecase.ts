import { randomUUID } from "node:crypto";
import { Lead } from "../domain/lead.entity.js";
import type { LeadRepositoryPort } from "../domain/ports.js";

export interface SubmitLeadInput {
  establishmentName: string;
  email: string;
  businessType: string;
}

/** Persists a lead submitted through the marketing landing page CTA (spec: marketing/lead-capture). */
export class SubmitLeadUseCase {
  constructor(private readonly leads: LeadRepositoryPort) {}

  async execute(input: SubmitLeadInput): Promise<Lead> {
    const id = randomUUID();
    const lead = Lead.create({
      id,
      establishmentName: input.establishmentName,
      email: input.email,
      businessType: input.businessType,
    });

    return this.leads.create({
      id: lead.id,
      establishmentName: lead.establishmentName,
      email: lead.email,
      businessType: lead.businessType,
    });
  }
}
