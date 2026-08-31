import Link from "next/link";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import type { OrderSummary } from "./page";

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  awaiting_payment: "Aguardando pagamento",
  paid: "Pago",
  fulfilled: "Concluído",
  partially_refunded: "Parcialmente reembolsado",
  refunded: "Reembolsado",
  cancelled: "Cancelado",
  expired: "Expirado",
};

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  draft: "neutral",
  awaiting_payment: "warning",
  paid: "success",
  fulfilled: "success",
  partially_refunded: "warning",
  refunded: "neutral",
  cancelled: "danger",
  expired: "danger",
};

/** spec: commerce/order - "Orders can be listed by tenant". No create action: Orders are only created via checkout. */
export function OrdersContent({ orders }: { orders: OrderSummary[] }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">Pedidos</h1>
        <p className="mt-1 text-sm text-fg-muted">Todos os pedidos deste tenant.</p>
      </div>

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
                  <Badge variant={STATUS_VARIANTS[order.status] ?? "neutral"}>
                    {STATUS_LABELS[order.status] ?? order.status}
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
