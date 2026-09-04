"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CartPayload } from "../../../pay/checkout/cart-payload";

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

export interface VariantAvailability {
  constrained: boolean;
  availableCapacity: number | null;
}

interface CartLine {
  quantity: number;
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Cart Client Component leaf (design.md - "client-rendered where it's
 * interactive"): holds transient quantity state with no server-side
 * representation until the buyer-details step at /pay/checkout creates the
 * Order (design.md - "Order creation moves to the payment step"). The
 * visit date and its per-variant `availability` come from the URL/Server
 * Component (design.md - M12.3), not client state, since availability is a
 * server read that depends on the date.
 */
export function CheckoutCart({
  tenantId,
  venueId,
  products,
  visitDate,
  availability,
}: {
  tenantId: string;
  venueId: string;
  products: StorefrontProduct[];
  visitDate: string;
  availability: Record<string, VariantAvailability>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const allVariants = useMemo(() => products.flatMap((product) => product.variants), [products]);
  // spec: storefront/checkout - "Single-option cart defaults quantity and
  // skips date selection": one ticket type, not tied to a bookable
  // Resource (always available "today"), pre-selects quantity 1 and hides
  // the date step.
  const singleAlwaysAvailableVariant =
    allVariants.length === 1 && !allVariants[0].resourceId ? allVariants[0] : undefined;

  const [cart, setCart] = useState<Record<string, CartLine>>(() =>
    singleAlwaysAvailableVariant ? { [singleAlwaysAvailableVariant.id]: { quantity: 1 } } : {},
  );

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

  function remainingCapacity(variantId: string): number | null {
    const entry = availability[variantId];
    if (!entry || !entry.constrained) return null;
    return entry.availableCapacity;
  }

  function setQuantity(variantId: string, quantity: number) {
    const remaining = remainingCapacity(variantId);
    const clamped = remaining === null ? quantity : Math.min(quantity, remaining);
    setCart((prev) => ({
      ...prev,
      [variantId]: { quantity: Math.max(0, clamped) },
    }));
  }

  function handleDateChange(value: string) {
    if (!ISO_DATE_PATTERN.test(value)) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", value);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function handleSubmit() {
    setError(undefined);

    if (selectedLines.length === 0) {
      setError("Selecione ao menos um item.");
      return;
    }

    const cartPayload: CartPayload = {
      tenantId,
      venueId,
      lines: selectedLines.map(([variantId, line]) => {
        const entry = variantsById.get(variantId);
        return {
          variantId,
          quantity: line.quantity,
          period: entry?.variant.resourceId ? visitDate : undefined,
        };
      }),
      summary: selectedLines.map(([variantId, line]) => {
        const entry = variantsById.get(variantId);
        return { name: entry?.variant.name ?? "", quantity: line.quantity, priceCents: entry?.variant.priceCents ?? 0 };
      }),
      totalCents,
    };

    router.push(`/pay/checkout?cart=${encodeURIComponent(JSON.stringify(cartPayload))}`);
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
      {!singleAlwaysAvailableVariant && (
        <Card>
          <CardHeader title="Data da visita" />
          <Input
            key={visitDate}
            label="Data"
            type="date"
            defaultValue={visitDate}
            onChange={(e) => handleDateChange(e.target.value)}
          />
        </Card>
      )}

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
              const quantity = line?.quantity ?? 0;
              const remaining = remainingCapacity(variant.id);
              const soldOut = remaining !== null && remaining <= 0;
              const exceedsRemaining = remaining !== null && quantity > remaining;
              return (
                <div key={variant.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-fg">{variant.name}</p>
                      <p className="text-sm text-fg-muted">{formatCents(variant.priceCents)}</p>
                      {remaining !== null && !soldOut && (
                        <p className="text-sm text-fg-muted">
                          {isPending ? "Atualizando disponibilidade…" : `${remaining} vagas restantes`}
                        </p>
                      )}
                      {soldOut && <p className="text-sm text-danger">Esgotado para a data selecionada</p>}
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                      <Input
                        label="Quantidade"
                        type="number"
                        min={0}
                        max={remaining ?? undefined}
                        className="w-24"
                        disabled={soldOut}
                        value={quantity}
                        onChange={(e) => setQuantity(variant.id, Number(e.target.value))}
                      />
                    </div>
                  </div>
                  {exceedsRemaining && (
                    <p className="text-sm text-danger">
                      Restam apenas {remaining} vaga{remaining === 1 ? "" : "s"} para essa data - ajuste a
                      quantidade.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      {/* spec: storefront/checkout - "Storefront checkout shows a clear
          order summary before payment": items, quantity, and running total
          live in a footer fixed to the bottom of the viewport. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface px-4 py-3 shadow-lg">
        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          {selectedLines.length === 0 ? (
            <p className="text-sm text-fg-muted">Nenhum item selecionado.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {selectedLines.map(([variantId, line]) => {
                const entry = variantsById.get(variantId);
                if (!entry) return null;
                return (
                  <div key={variantId} className="flex justify-between text-xs text-fg-muted">
                    <span>
                      {entry.variant.name} x{line.quantity}
                    </span>
                    <span>{formatCents(entry.variant.priceCents * line.quantity)}</span>
                  </div>
                );
              })}
            </div>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-fg">Total: {formatCents(totalCents)}</span>
            <Button onClick={handleSubmit} disabled={selectedLines.length === 0}>
              Ir para pagamento
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
