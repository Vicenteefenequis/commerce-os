"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export interface TicketSummary {
  id: string;
  code: string;
}

/**
 * spec: storefront/ticket-view. Shows exactly one Ticket's QR at a
 * time, with previous/next navigation across the Order's Tickets when
 * there is more than one - no navigation controls for a single ticket,
 * and no wrap past either end.
 */
export function TicketViewer({ tickets, tenantId }: { tickets: TicketSummary[]; tenantId: string }) {
  const [index, setIndex] = useState(0);
  const ticket = tickets[index];
  if (!ticket) return null;

  const hasMultiple = tickets.length > 1;

  return (
    <div className="flex flex-col items-center gap-4">
      {hasMultiple && (
        <p className="text-xs text-fg-muted">
          Ingresso {index + 1} de {tickets.length}
        </p>
      )}
      <img
        src={`/api/tickets/${ticket.id}/qrcode?tenantId=${encodeURIComponent(tenantId)}`}
        alt={`QR do ingresso ${ticket.code}`}
        width={220}
        height={220}
        className="rounded-md border border-border"
      />
      <p className="font-mono text-sm text-fg">{ticket.code}</p>
      {hasMultiple && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIndex((current) => current - 1)}
            disabled={index === 0}
          >
            Anterior
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIndex((current) => current + 1)}
            disabled={index === tickets.length - 1}
          >
            Próximo
          </Button>
        </div>
      )}
    </div>
  );
}
