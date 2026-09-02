"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { submitCheckout } from "./actions";

export interface StorefrontVariant {
  id: string;
  name: string;
  priceCents: number;
  resourceId: string | null;
}

export interface StorefrontProduct {
  id: string;
  name: string;
  variants: StorefrontVariant[];
}

interface CartLine {
  quantity: number;
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Cart/buyer-details Client Component leaf (design.md - "client-rendered
 * where it's interactive"): holds transient selection state with no
 * server-side representation until POST /checkout.
 */
export function CheckoutCart({
  tenantId,
  venueId,
  products,
}: {
  tenantId: string;
  venueId: string;
  products: StorefrontProduct[];
}) {
  const router = useRouter();
  const [visitDate, setVisitDate] = useState(todayIsoDate());
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const variantsById = useMemo(() => {
    const map = new Map<string, { product: StorefrontProduct; variant: StorefrontVariant }>();
    for (const product of products) {
      for (const variant of product.variants) {
        map.set(variant.id, { product, variant });
      }
    }
    return map;
  }, [products]);

  const selectedLines = Object.entries(cart).filter(([, line]) => line.quantity > 0);
  const totalCents = selectedLines.reduce((sum, [variantId, line]) => {
    const entry = variantsById.get(variantId);
    return entry ? sum + entry.variant.priceCents * line.quantity : sum;
  }, 0);

  function setQuantity(variantId: string, quantity: number) {
    setCart((prev) => ({
      ...prev,
      [variantId]: { quantity: Math.max(0, quantity) },
    }));
  }

  async function handleSubmit() {
    setError(undefined);

    if (selectedLines.length === 0) {
      setError("Selecione ao menos um item.");
      return;
    }
    if (!email || !name) {
      setError("Informe seu nome e e-mail.");
      return;
    }

    setIsSubmitting(true);
    const result = await submitCheckout({
      tenantId,
      venueId,
      customer: { email, name },
      lines: selectedLines.map(([variantId, line]) => {
        const entry = variantsById.get(variantId);
        return {
          variantId,
          quantity: line.quantity,
          period: entry?.variant.resourceId ? visitDate : undefined,
        };
      }),
    });
    setIsSubmitting(false);

    if (result.error || !result.orderId) {
      setError(result.error ?? "Não foi possível concluir a compra");
      return;
    }
    router.push(`/pay/${result.orderId}?tenantId=${encodeURIComponent(tenantId)}`);
  }

  if (products.length === 0) {
    return (
      <Card>
        <CardHeader title="Nenhum produto disponível" description="Volte mais tarde para conferir a oferta." />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader title="Data da visita" />
        <Input
          label="Data"
          type="date"
          value={visitDate}
          onChange={(e) => setVisitDate(e.target.value)}
        />
      </Card>

      {products.map((product) => (
        <Card key={product.id}>
          <CardHeader
            title={product.name}
            description={
              product.variants.length > 1
                ? `${product.variants.length} tipos de ingresso disponíveis`
                : undefined
            }
          />
          <div className="flex flex-col divide-y divide-border">
            {product.variants.map((variant) => {
              const line = cart[variant.id];
              return (
                <div key={variant.id} className="flex flex-wrap items-end justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-fg">{variant.name}</p>
                    <p className="text-sm text-fg-muted">{formatCents(variant.priceCents)}</p>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <Input
                      label="Quantidade"
                      type="number"
                      min={0}
                      className="w-24"
                      value={line?.quantity ?? 0}
                      onChange={(e) => setQuantity(variant.id, Number(e.target.value))}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      <Card>
        <CardHeader title="Seus dados" />
        <div className="flex flex-col gap-4">
          <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Resumo do pedido" />
        <div className="flex flex-col gap-2">
          {selectedLines.length === 0 && <p className="text-sm text-fg-muted">Nenhum item selecionado.</p>}
          {selectedLines.map(([variantId, line]) => {
            const entry = variantsById.get(variantId);
            if (!entry) return null;
            return (
              <div key={variantId} className="flex justify-between text-sm text-fg">
                <span>
                  {entry.variant.name} x{line.quantity}
                </span>
                <span>{formatCents(entry.variant.priceCents * line.quantity)}</span>
              </div>
            );
          })}
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-semibold text-fg">
            <span>Total</span>
            <span>{formatCents(totalCents)}</span>
          </div>
        </div>
        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        <Button className="mt-4 w-full" onClick={handleSubmit} isLoading={isSubmitting}>
          Ir para pagamento
        </Button>
      </Card>
    </div>
  );
}
