import { Card, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import type { DashboardSummary, VenueOption } from "./page";

const PERIOD_OPTIONS = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "custom", label: "Personalizado" },
];

function formatCents(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2)}`;
}

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

/** spec: admin/dashboard - sales/orders/visitors summary, filterable by venue and period. */
export function DashboardContent({
  summary,
  venues,
  period,
  venueId,
  from,
  to,
}: {
  summary: DashboardSummary | null;
  venues: VenueOption[];
  period: string;
  venueId: string;
  from: string;
  to: string;
}) {
  const counts = summary?.orders.countsByStatus ?? {};
  const totalOrders = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">Dashboard</h1>
        <p className="mt-1 text-sm text-fg-muted">Vendas, pedidos e visitantes deste tenant.</p>
      </div>

      <form
        method="GET"
        className="flex flex-col flex-wrap gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-end"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dashboard-period" className="text-sm font-medium text-fg">
            Período
          </label>
          <select
            id="dashboard-period"
            name="period"
            defaultValue={period}
            className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-fg sm:w-auto"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dashboard-from" className="text-sm font-medium text-fg">
            De (personalizado)
          </label>
          <input
            id="dashboard-from"
            type="date"
            name="from"
            defaultValue={toDateInputValue(from)}
            className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-fg sm:w-auto"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dashboard-to" className="text-sm font-medium text-fg">
            Até (personalizado)
          </label>
          <input
            id="dashboard-to"
            type="date"
            name="to"
            defaultValue={toDateInputValue(to)}
            className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-fg sm:w-auto"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dashboard-venue" className="text-sm font-medium text-fg">
            Unidade
          </label>
          <select
            id="dashboard-venue"
            name="venueId"
            defaultValue={venueId}
            className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-fg sm:w-auto"
          >
            <option value="">Todas</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:opacity-90 sm:w-auto"
        >
          Aplicar
        </button>
      </form>

      {!summary ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border-strong px-6 py-16 text-center">
          <p className="text-sm text-fg-muted">Não foi possível carregar o resumo.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader title="Vendas (GMV)" />
              <p className="text-2xl font-semibold text-fg">{formatCents(summary.sales.gmvCents)}</p>
              <p className="mt-1 text-sm text-fg-muted">
                Ticket médio: {formatCents(summary.sales.averageOrderValueCents)}
              </p>
            </Card>
            <Card>
              <CardHeader title="Pedidos" />
              <p className="text-2xl font-semibold text-fg">{totalOrders}</p>
              <p className="mt-1 text-sm text-fg-muted">no período selecionado</p>
            </Card>
            <Card>
              <CardHeader title="Visitantes" />
              <p className="text-2xl font-semibold text-fg">{summary.visitors.authorizedCount}</p>
              <p className="mt-1 text-sm text-fg-muted">entradas autorizadas</p>
            </Card>
          </div>

          <Card>
            <CardHeader title="Pedidos por status" />
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Quantidade</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(counts)
                  .filter(([, count]) => count > 0)
                  .map(([status, count]) => (
                    <TableRow key={status}>
                      <TableCell>{ORDER_STATUS_LABELS[status] ?? status}</TableCell>
                      <TableCell>{count}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
