"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  createCounterSale,
  getOrderTickets,
  type CounterSaleOrder,
  type CounterSalePayment,
  type OrderTicketSummary,
} from "./actions";

interface Venue {
  id: string;
  name: string;
}

interface Variant {
  id: string;
  name: string;
  priceCents: number;
  resourceId: string | null;
}

interface Product {
  id: string;
  name: string;
  variants: Variant[];
}

interface LoteOption {
  variantId: string;
  label: string;
  priceCents: number;
  resourceId: string | null;
}

function formatCents(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2)}`;
}

/** Polls a few times for the Entitlements/Tickets an outbox consumer issues asynchronously right after the Order is paid (same eventual-consistency the storefront payment screen already lives with - see apps/web/app/pay/[orderId]/pay-form.tsx). */
async function pollForTickets(orderId: string): Promise<OrderTicketSummary[]> {
  const maxAttempts = 10;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const tickets = await getOrderTickets(orderId);
    if (tickets.length > 0) return tickets;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return [];
}

export function CounterSaleContent({
  venues,
  venueId,
  products,
}: {
  venues: Venue[];
  venueId?: string;
  products: Product[];
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [period, setPeriod] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const [result, setResult] = useState<{ order: CounterSaleOrder; payment: CounterSalePayment } | null>(null);
  const [tickets, setTickets] = useState<OrderTicketSummary[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);

  const lotes: LoteOption[] = products.flatMap((product) =>
    product.variants.map((variant) => ({
      variantId: variant.id,
      label: `${product.name} — ${variant.name} (${formatCents(variant.priceCents)})`,
      priceCents: variant.priceCents,
      resourceId: variant.resourceId,
    })),
  );
  const selectedLote = lotes.find((l) => l.variantId === variantId);

  useEffect(() => {
    if (!result) return;
    setIsLoadingTickets(true);
    pollForTickets(result.order.id)
      .then(setTickets)
      .finally(() => setIsLoadingTickets(false));
  }, [result]);

  function onSelectVenue(nextVenueId: string) {
    router.push(`/admin/counter-sales?venueId=${nextVenueId}`);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!venueId || !variantId) {
      setError("Selecione a unidade e o ingresso.");
      return;
    }
    setIsSubmitting(true);
    setError(undefined);

    const outcome = await createCounterSale({
      venueId,
      variantId,
      quantity: Number(quantity) || 1,
      period: selectedLote?.resourceId ? period : undefined,
      buyerEmail,
      buyerName,
    });

    setIsSubmitting(false);
    if (outcome.error || !outcome.order || !outcome.payment) {
      setError(outcome.error ?? "Falha ao registrar venda");
      return;
    }

    setResult({ order: outcome.order, payment: outcome.payment });
    showToast({ title: "Venda registrada", variant: "success" });
  }

  function onNewSale() {
    setResult(null);
    setTickets([]);
    setVariantId("");
    setQuantity("1");
    setPeriod("");
    setBuyerEmail("");
    setBuyerName("");
    setError(undefined);
  }

  if (result) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-fg">Venda registrada</h1>
          <p className="mt-1 text-sm text-fg-muted">Pedido criado e pago no balcão.</p>
        </div>

        <Card>
          <CardHeader title="Resumo" />
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-fg-muted">Pedido</dt>
            <dd className="font-mono text-xs text-fg">{result.order.id}</dd>
            <dt className="text-fg-muted">Total</dt>
            <dd className="text-fg">{formatCents(result.order.totalCents)}</dd>
            <dt className="text-fg-muted">Pagamento</dt>
            <dd className="text-fg">Dinheiro (confirmado)</dd>
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="Ingressos"
            description="Imprima o ingresso para outra pessoa validar na entrada."
          />
          {isLoadingTickets ? (
            <p className="text-sm text-fg-muted">Gerando ingressos...</p>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-fg-muted">
              Os ingressos ainda não apareceram. Eles aparecem em instantes em{" "}
              <a href={`/admin/orders/${result.order.id}`} className="text-primary hover:underline">
                detalhes do pedido
              </a>
              .
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {tickets.map((ticket) => (
                <li
                  key={ticket.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                >
                  <span className="font-mono text-xs text-fg">{ticket.code}</span>
                  <a
                    href={`/admin/tickets/${ticket.id}/print`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-border-strong px-3 py-1.5 text-sm text-fg hover:bg-bg-subtle"
                  >
                    Imprimir
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Button variant="secondary" type="button" onClick={onNewSale}>
          Registrar nova venda
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">Venda no balcão</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Para quem comprou o ingresso presencialmente, sem passar pela loja online.
        </p>
      </div>

      <div className="max-w-xs">
        <Select
          label="Unidade"
          value={venueId}
          onValueChange={onSelectVenue}
          options={venues.map((v) => ({ value: v.id, label: v.name }))}
          placeholder="Selecione uma unidade"
        />
      </div>

      <Card>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Select
            label="Ingresso"
            value={variantId}
            onValueChange={setVariantId}
            options={lotes.map((l) => ({ value: l.variantId, label: l.label }))}
            placeholder={lotes.length ? "Selecione o ingresso" : "Nenhum produto cadastrado nesta unidade"}
            disabled={lotes.length === 0}
          />

          <Input
            label="Quantidade"
            type="number"
            min={1}
            step={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />

          {selectedLote?.resourceId && (
            <Input
              label="Data/período"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="ex.: 2026-06-15"
            />
          )}

          <div className="flex flex-col gap-1.5 border-t border-border pt-4">
            <span className="text-sm font-medium text-fg">Comprador (opcional)</span>
            <p className="text-xs text-fg-muted">
              Deixe em branco para uma venda anônima de balcão.
            </p>
          </div>
          <Input label="Nome" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
          <Input
            label="E-mail"
            type="email"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
          />

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" isLoading={isSubmitting} disabled={!venueId || !variantId}>
            Registrar venda (dinheiro)
          </Button>
        </form>
      </Card>
    </div>
  );
}
