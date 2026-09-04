"use client";

import { useState } from "react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import type { OrderDetail } from "./page";
import { cancelOrder, fulfillOrder, refundPayment } from "./actions";

const ORDER_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  awaiting_payment: "Aguardando pagamento",
  paid: "Pago",
  fulfilled: "Concluído",
  partially_refunded: "Parcialmente reembolsado",
  refunded: "Reembolsado",
  cancelled: "Cancelado",
  expired: "Expirado",
};

const ORDER_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  draft: "neutral",
  awaiting_payment: "warning",
  paid: "success",
  fulfilled: "success",
  partially_refunded: "warning",
  refunded: "neutral",
  cancelled: "danger",
  expired: "danger",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  succeeded: "Confirmado",
  failed: "Falhou",
  partially_refunded: "Parcialmente reembolsado",
  refunded: "Reembolsado",
};

const PAYMENT_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  pending: "warning",
  succeeded: "success",
  failed: "danger",
  partially_refunded: "warning",
  refunded: "neutral",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: "Cartão",
  pix: "Pix",
};

type ActionKey = "cancel" | "fulfill" | "refund";

/** spec: commerce/order, commerce/fulfillment, payments/payment - admin cancel/fulfill/refund. */
export function OrderDetailContent({ order }: { order: OrderDetail }) {
  const { showToast } = useToast();
  const [pendingAction, setPendingAction] = useState<ActionKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canCancel = order.status === "draft" || order.status === "awaiting_payment";
  const canFulfill = order.status === "paid";
  const remainingRefundableCents = order.payment ? order.payment.amountCents - order.payment.refundedAmountCents : 0;
  const canRefund =
    order.payment !== null &&
    (order.payment.status === "succeeded" || order.payment.status === "partially_refunded") &&
    remainingRefundableCents > 0;

  async function runAction(key: ActionKey, fn: () => Promise<{ error?: string }>, successMessage: string) {
    setPendingAction(key);
    setError(null);
    const result = await fn();
    setPendingAction(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    showToast({ title: successMessage, variant: "success" });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-lg font-semibold text-fg">{order.id}</h1>
          <p className="mt-1 text-sm text-fg-muted">Unidade: {order.venueId}</p>
        </div>
        <Badge variant={ORDER_STATUS_VARIANTS[order.status] ?? "neutral"}>
          {ORDER_STATUS_LABELS[order.status] ?? order.status}
        </Badge>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-fg">Itens</h2>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Item</TableHeaderCell>
              <TableHeaderCell>Preço unitário</TableHeaderCell>
              <TableHeaderCell>Quantidade</TableHeaderCell>
              <TableHeaderCell>Total</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {order.lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>{line.name}</TableCell>
                <TableCell>R$ {(line.unitPriceCents / 100).toFixed(2)}</TableCell>
                <TableCell>{line.quantity}</TableCell>
                <TableCell>R$ {((line.unitPriceCents * line.quantity) / 100).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-right text-sm font-semibold text-fg">Total: R$ {(order.totalCents / 100).toFixed(2)}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-fg">Pagamento</h2>
        {order.payment ? (
          <div className="flex flex-col gap-2 rounded-md border border-border p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-fg-muted">{order.payment.id}</span>
              <Badge variant={PAYMENT_STATUS_VARIANTS[order.payment.status] ?? "neutral"}>
                {PAYMENT_STATUS_LABELS[order.payment.status] ?? order.payment.status}
              </Badge>
            </div>
            <p className="text-fg-muted">Método: {PAYMENT_METHOD_LABELS[order.payment.method] ?? order.payment.method}</p>
            <p className="text-fg-muted">Valor: R$ {(order.payment.amountCents / 100).toFixed(2)}</p>
            {order.payment.refundedAmountCents > 0 && (
              <p className="text-fg-muted">Reembolsado: R$ {(order.payment.refundedAmountCents / 100).toFixed(2)}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-fg-muted">Nenhum pagamento para este pedido.</p>
        )}
      </section>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          disabled={!canCancel}
          isLoading={pendingAction === "cancel"}
          onClick={() => runAction("cancel", () => cancelOrder(order.id), "Pedido cancelado")}
        >
          Cancelar pedido
        </Button>
        <Button
          disabled={!canFulfill}
          isLoading={pendingAction === "fulfill"}
          onClick={() => runAction("fulfill", () => fulfillOrder(order.id), "Pedido concluído")}
        >
          Concluir pedido
        </Button>
        <Button
          variant="destructive"
          disabled={!canRefund}
          isLoading={pendingAction === "refund"}
          onClick={() =>
            runAction(
              "refund",
              () => refundPayment(order.id, order.payment!.id, remainingRefundableCents),
              "Pagamento reembolsado",
            )
          }
        >
          Reembolsar pagamento
        </Button>
      </div>
    </div>
  );
}
