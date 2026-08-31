import type { Lead } from "./lead.entity.js";

export interface LeadRepositoryPort {
  create(lead: { id: string; establishmentName: string; email: string; businessType: string }): Promise<Lead>;
}
