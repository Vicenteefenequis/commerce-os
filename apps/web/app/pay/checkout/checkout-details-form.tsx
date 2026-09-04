"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createOrder } from "./actions";
import type { CartPayload } from "./cart-payload";

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * spec: payments/payment - "Payment page collects buyer identification
 * before payment", "Payment cannot proceed without buyer identification".
 * The order summary/total is carried from the cart step (`cart` prop), so
 * the button below shows the real total immediately - never "R$ 0,00"
 * before interaction (proposal.md - "What Changes").
 */
export function CheckoutDetailsForm({ cart }: { cart: CartPayload }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canContinue = email.trim().length > 0 && name.trim().length > 0;

  async function handleSubmit() {
    setError(undefined);
    if (!canContinue) {
      setError("Informe seu nome e e-mail.");
      return;
    }

    setIsSubmitting(true);
    const result = await createOrder({
      tenantId: cart.tenantId,
      venueId: cart.venueId,
      lines: cart.lines,
      customer: { email, name },
    });
    setIsSubmitting(false);

    if (result.error || !result.orderId) {
      setError(result.error ?? "Não foi possível concluir a compra");
      return;
    }
    router.push(`/pay/${result.orderId}?tenantId=${encodeURIComponent(cart.tenantId)}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader title="Seus dados" description="Para identificar seu pedido e enviar os ingressos." />
        <div className="flex flex-col gap-4">
          <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Resumo do pedido" />
        <div className="flex flex-col gap-2">
          {cart.summary.map((line, index) => (
            <div key={index} className="flex justify-between text-sm text-fg">
              <span>
                {line.name} x{line.quantity}
              </span>
              <span>{formatCents(line.priceCents * line.quantity)}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-semibold text-fg">
            <span>Total</span>
            <span>{formatCents(cart.totalCents)}</span>
          </div>
        </div>
        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        <Button
          className="mt-4 w-full"
          onClick={handleSubmit}
          isLoading={isSubmitting}
          disabled={!canContinue}
        >
          Ir para pagamento · {formatCents(cart.totalCents)}
        </Button>
      </Card>
    </div>
  );
}
