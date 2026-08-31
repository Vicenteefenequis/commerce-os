import { sql } from "kysely";
import type { Trx } from "../../../http/tx-route.js";
import type { OrderStatus } from "../../commerce/domain/order.entity.js";
import {
  GMV_ORDER_STATUSES,
  type DashboardSummary,
  type DashboardSummaryQuery,
  type DashboardSummaryRepositoryPort,
} from "../domain/dashboard-summary.js";

const ALL_ORDER_STATUSES: OrderStatus[] = [
  "draft",
  "awaiting_payment",
  "paid",
  "fulfilled",
  "partially_refunded",
  "refunded",
  "cancelled",
  "expired",
];

export class KyselyDashboardSummaryRepository implements DashboardSummaryRepositoryPort {
  constructor(private readonly trx: Trx) {}

  /**
   * design.md - GMV is the pre-refund order total (sum of order_lines),
   * not the payment's net amount, so a later refund doesn't retroactively
   * shrink the GMV of the period it was originally sold in.
   */
  async getSummary(query: DashboardSummaryQuery): Promise<DashboardSummary> {
    let statusRowsQuery = this.trx
      .selectFrom("orders")
      .leftJoin("order_lines", (join) =>
        join.onRef("order_lines.order_id", "=", "orders.id").onRef("order_lines.tenant_id", "=", "orders.tenant_id"),
      )
      .select(({ fn }) => [
        "orders.status as status",
        fn.count<string>("orders.id").distinct().as("order_count"),
        sql<string>`coalesce(sum(order_lines.unit_price_cents * order_lines.quantity), 0)`.as("total_cents"),
      ])
      .where("orders.tenant_id", "=", query.tenantId)
      .where(sql<boolean>`orders.created_at >= ${query.from}`)
      .where(sql<boolean>`orders.created_at < ${query.to}`)
      .groupBy("orders.status");

    if (query.venueId) {
      statusRowsQuery = statusRowsQuery.where("orders.venue_id", "=", query.venueId);
    }

    const statusRows = await statusRowsQuery.execute();

    const countsByStatus = Object.fromEntries(ALL_ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
    let gmvCents = 0;
    let gmvOrderCount = 0;
    for (const row of statusRows) {
      const status = row.status as OrderStatus;
      const count = Number(row.order_count);
      countsByStatus[status] = count;
      if (GMV_ORDER_STATUSES.includes(status)) {
        gmvCents += Number(row.total_cents);
        gmvOrderCount += count;
      }
    }

    let visitorsQuery = this.trx
      .selectFrom("scan_attempts")
      .select(({ fn }) => fn.countAll<string>().as("count"))
      .where("tenant_id", "=", query.tenantId)
      .where("outcome", "=", "authorized")
      .where("scanned_at", ">=", query.from)
      .where("scanned_at", "<", query.to);

    if (query.venueId) {
      visitorsQuery = visitorsQuery.where("venue_id", "=", query.venueId);
    }

    const visitorsRow = await visitorsQuery.executeTakeFirstOrThrow();

    return {
      sales: {
        gmvCents,
        averageOrderValueCents: gmvOrderCount > 0 ? Math.round(gmvCents / gmvOrderCount) : 0,
      },
      orders: {
        countsByStatus,
      },
      visitors: {
        authorizedCount: Number(visitorsRow.count),
      },
    };
  }
}
