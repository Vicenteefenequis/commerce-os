import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANTS } from "@/lib/order-status";
import type { OrderSummary } from "./page";

export interface OrderFilters {
  id?: string;
  customer?: string;
  status?: string;
}

const STATUS_OPTIONS = Object.entries(ORDER_STATUS_LABELS);

/** spec: commerce/order - "Orders can be listed by tenant". No create action: Orders are only created via checkout. */
export function OrdersContent({ orders, filters }: { orders: OrderSummary[]; filters: OrderFilters }) {
  const hasFilters = Boolean(filters.id || filters.customer || filters.status);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">Pedidos</h1>
        <p className="mt-1 text-sm text-fg-muted">Todos os pedidos deste tenant.</p>
      </div>

      <form method="GET" className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="order-id" className="text-sm font-medium text-fg">
            ID do pedido
          </label>
          <input
            id="order-id"
            name="id"
            defaultValue={filters.id ?? ""}
            className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-fg"
            placeholder="uuid do pedido"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="order-customer" className="text-sm font-medium text-fg">
            Cliente
          </label>
          <input
            id="order-customer"
            name="customer"
            defaultValue={filters.customer ?? ""}
            className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-fg"
            placeholder="e-mail ou nome"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="order-status" className="text-sm font-medium text-fg">
            Status
          </label>
          <select
            id="order-status"
            name="status"
            defaultValue={filters.status ?? ""}
            className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-fg"
          >
            <option value="">Todos</option>
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:opacity-90"
        >
          Buscar
        </button>
        {hasFilters && (
          <Link href="/admin/orders" className="text-sm text-fg-muted hover:text-fg">
            Limpar filtros
          </Link>
        )}
      </form>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border-strong px-6 py-16 text-center">
          <p className="text-sm text-fg-muted">Nenhum pedido encontrado.</p>
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>ID</TableHeaderCell>
              <TableHeaderCell>Unidade</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Total</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs">
                  <Link href={`/admin/orders/${order.id}`} className="text-primary hover:underline">
                    {order.id}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-xs">{order.venueId}</TableCell>
                <TableCell>
                  <Badge variant={ORDER_STATUS_VARIANTS[order.status] ?? "neutral"}>
                    {ORDER_STATUS_LABELS[order.status] ?? order.status}
                  </Badge>
                </TableCell>
                <TableCell>R$ {(order.totalCents / 100).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
