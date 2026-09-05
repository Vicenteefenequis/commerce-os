"use client";

import { useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { createPaymentIntent } from "./actions";
import { TicketViewer, type TicketSummary } from "./ticket-viewer";

type PaymentMethod = "card" | "pix";
type Phase = "select_method" | "collecting" | "confirming" | "checking" | "succeeded" | "failed" | "error";

let stripePromise: Promise<Stripe | null> | undefined;
function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    stripePromise = publishableKey ? loadStripe(publishableKey) : Promise.resolve(null);
  }
  return stripePromise;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando confirmação...",
  succeeded: "Pagamento confirmado!",
  failed: "Pagamento não aprovado.",
  partially_refunded: "Pagamento reembolsado parcialmente.",
  refunded: "Pagamento reembolsado.",
};

/**
 * spec: payments/payment - "Redirect without server-side confirmation
 * does not confirm payment" (PAY-004). Client-side confirmation only
 * decides whether to keep polling; the displayed final status always
 * comes from GET /api/payments/:id/status, which reflects only what the
 * webhook has confirmed server-to-server.
 */
async function pollPaymentStatus(paymentId: string, tenantId: string): Promise<string> {
  const maxAttempts = 20;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(`/api/payments/${paymentId}/status?tenantId=${encodeURIComponent(tenantId)}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const body: { status?: string } = await res.json();
      if (body.status && body.status !== "pending") return body.status;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return "pending";
}

/**
 * spec: storefront/ticket-view - "Ticket view is shown only after
 * payment succeeds". Called only once the client-side poll above
 * resolves to `succeeded`; a failed fetch simply leaves the viewer
 * empty rather than surfacing a second error state.
 */
async function fetchOrderTickets(orderId: string, tenantId: string): Promise<TicketSummary[]> {
  const res = await fetch(`/api/orders/${orderId}/tickets?tenantId=${encodeURIComponent(tenantId)}`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const body: { tickets?: TicketSummary[] } = await res.json();
  return body.tickets ?? [];
}

function CheckoutForm({
  paymentId,
  tenantId,
  onDone,
}: {
  paymentId: string;
  tenantId: string;
  onDone: (phase: Phase, message?: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm() {
    if (!stripe || !elements) return;
    setIsSubmitting(true);

    const { error } = await stripe.confirmPayment({ elements, redirect: "if_required" });
    if (error) {
      onDone("failed", error.message);
      setIsSubmitting(false);
      return;
    }

    onDone("checking");
    const finalStatus = await pollPaymentStatus(paymentId, tenantId);
    onDone(finalStatus === "succeeded" ? "succeeded" : "failed");
  }

  return (
    <div className="flex flex-col gap-4">
      <PaymentElement />
      <Button onClick={handleConfirm} isLoading={isSubmitting} disabled={!stripe}>
        Confirmar pagamento
      </Button>
    </div>
  );
}

export function PayForm({ orderId, tenantId }: { orderId: string; tenantId: string }) {
  const [phase, setPhase] = useState<Phase>("select_method");
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [clientSecret, setClientSecret] = useState<string>();
  const [paymentId, setPaymentId] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [tickets, setTickets] = useState<TicketSummary[]>();

  async function startPayment() {
    setPhase("confirming");
    const result = await createPaymentIntent(orderId, tenantId, method);
    if (result.error || !result.clientSecret || !result.paymentId) {
      setPhase("error");
      setMessage(result.error ?? "Não foi possível iniciar o pagamento");
      return;
    }
    setClientSecret(result.clientSecret);
    setPaymentId(result.paymentId);
    setPhase("collecting");
  }

  function handleDone(nextPhase: Phase, doneMessage?: string) {
    setPhase(nextPhase);
    setMessage(doneMessage);
    if (nextPhase === "succeeded") {
      fetchOrderTickets(orderId, tenantId).then(setTickets);
    }
  }

  if (phase === "succeeded") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-center text-sm font-medium text-fg">{STATUS_LABEL.succeeded}</p>
        {tickets === undefined ? (
          <p className="text-center text-sm text-fg-muted">Carregando ingressos...</p>
        ) : (
          <TicketViewer tickets={tickets} tenantId={tenantId} />
        )}
      </div>
    );
  }

  if (phase === "failed") {
    return (
      <Card>
        <CardHeader title={STATUS_LABEL.failed} description={message} />
      </Card>
    );
  }

  if (phase === "select_method" || phase === "confirming" || phase === "error") {
    return (
      <Card>
        <CardHeader title="Pagamento" description="Escolha a forma de pagamento" />
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={method === "card" ? "primary" : "secondary"}
              onClick={() => setMethod("card")}
            >
              Cartão
            </Button>
            <Button
              type="button"
              variant={method === "pix" ? "primary" : "secondary"}
              onClick={() => setMethod("pix")}
            >
              Pix
            </Button>
          </div>
          <Button onClick={startPayment} isLoading={phase === "confirming"}>
            Continuar
          </Button>
          {phase === "error" && message && <p className="text-sm text-danger">{message}</p>}
        </div>
      </Card>
    );
  }

  if (phase === "checking") {
    return (
      <Card>
        <CardHeader title="Confirmando pagamento..." description="Aguarde, isso pode levar alguns segundos." />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Pagamento" />
      <Elements stripe={getStripe()} options={{ clientSecret }}>
        <CheckoutForm paymentId={paymentId!} tenantId={tenantId} onDone={handleDone} />
      </Elements>
    </Card>
  );
}
