import type { OrderChannel, OrderStatus } from "../../commerce/domain/order.entity.js";

/** GMV-counted statuses (spec: admin/dashboard - "Summary reports sales figures"). */
export const GMV_ORDER_STATUSES: OrderStatus[] = ["paid", "fulfilled", "partially_refunded", "refunded"];

export interface DashboardSummaryQuery {
  tenantId: string;
  venueId?: string;
  from: Date;
  to: Date;
}

/** spec: admin/dashboard - "Summary reports sales figures by channel". */
export interface DashboardChannelBreakdown {
  gmvCents: number;
  orderCount: number;
  ticketCount: number;
}

export interface DashboardSummary {
  sales: {
    gmvCents: number;
    averageOrderValueCents: number;
  };
  orders: {
    countsByStatus: Record<OrderStatus, number>;
  };
  visitors: {
    authorizedCount: number;
  };
  channels: Record<OrderChannel, DashboardChannelBreakdown>;
}

export interface DashboardSummaryRepositoryPort {
  getSummary(query: DashboardSummaryQuery): Promise<DashboardSummary>;
}
