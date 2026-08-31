import type { Trx } from "../../../http/tx-route.js";
import { Lead } from "../domain/lead.entity.js";
import type { LeadRepositoryPort } from "../domain/ports.js";

export class KyselyLeadRepository implements LeadRepositoryPort {
  constructor(private readonly trx: Trx) {}

  async create(lead: { id: string; establishmentName: string; email: string; businessType: string }): Promise<Lead> {
    const row = await this.trx
      .insertInto("leads")
      .values({
        id: lead.id,
        establishment_name: lead.establishmentName,
        email: lead.email,
        business_type: lead.businessType,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return Lead.create({
      id: row.id,
      establishmentName: row.establishment_name,
      email: row.email,
      businessType: row.business_type,
    });
  }
}
