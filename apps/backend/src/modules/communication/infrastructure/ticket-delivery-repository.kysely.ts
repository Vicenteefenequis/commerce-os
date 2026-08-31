import type { Trx } from "../../../http/tx-route.js";
import type { RecordTicketDeliveryInput, TicketDeliveryRepositoryPort } from "../domain/ports.js";

export class KyselyTicketDeliveryRepository implements TicketDeliveryRepositoryPort {
  constructor(private readonly trx: Trx) {}

  async record(input: RecordTicketDeliveryInput): Promise<void> {
    await this.trx
      .insertInto("ticket_deliveries")
      .values({ id: input.id, tenant_id: input.tenantId, order_id: input.orderId, status: input.status })
      .execute();
  }
}
