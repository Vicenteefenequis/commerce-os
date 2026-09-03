import { sql } from "kysely";
import type { Trx } from "../../../http/tx-route.js";
import type { TenantContextPort } from "../domain/ports.js";

export class KyselyTenantContext implements TenantContextPort {
  constructor(private readonly trx: Trx) {}

  async setTenantId(tenantId: string): Promise<void> {
    await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(this.trx);
  }
}
