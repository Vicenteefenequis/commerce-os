"use client";

import { useState } from "react";

export interface TicketValidityWindow {
  start: string;
  end: string;
}

export interface TicketSummary {
  id: string;
  code: string;
  organizationName: string;
  organizationSlug: string;
  offerName: string;
  loteName: string;
  buyerName: string;
  /** Present only when the Ticket's Entitlement is Reservation-backed. */
  validity?: TicketValidityWindow;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });
const TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

function formatValidity(validity: TicketValidityWindow): string {
  const start = new Date(validity.start);
  const end = new Date(validity.end);
  return `Válido de ${DATE_FORMATTER.format(start)} ${TIME_FORMATTER.format(start)} até ${DATE_FORMATTER.format(end)} ${TIME_FORMATTER.format(end)}`;
}

/**
 * spec: storefront/ticket-view. Shows exactly one Ticket's full display
 * context at a time - tenant identity, large QR, code as text, offer/
 * lote/holder details, its validity window when Reservation-backed, and
 * an entry-rule banner describing what the system actually enforces
 * (design.md D1) - with previous/next navigation across the Order's
 * Tickets when there is more than one. No navigation controls for a
 * single ticket, and no wrap past either end (unchanged from before this
 * redesign).
 */
export function TicketViewer({ tickets, tenantId }: { tickets: TicketSummary[]; tenantId: string }) {
  const [index, setIndex] = useState(0);
  const ticket = tickets[index];
  if (!ticket) return null;

  const hasMultiple = tickets.length > 1;
  const initial = ticket.organizationName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="storefront-theme flex flex-col gap-4 rounded-sf-2xl border border-sf-border-strong bg-sf-surface-raised p-6 font-sf-sans">
      {hasMultiple && (
        <p className="text-center font-mono font-sf-mono text-[11px] text-sf-fg-subtle">
          Ingresso {index + 1} de {tickets.length}
        </p>
      )}

      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sf-pill bg-sf-accent text-[15px] font-extrabold text-sf-on-accent"
        >
          {initial}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[15px] font-bold tracking-[-.01em] text-sf-fg">
            {ticket.organizationName}
          </span>
          <span className="font-sf-mono text-[11px] text-sf-fg-subtle">@{ticket.organizationSlug}</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <img
          src={`/api/tickets/${ticket.id}/qrcode?tenantId=${encodeURIComponent(tenantId)}`}
          alt={`QR do ingresso ${ticket.code}`}
          width={220}
          height={220}
          className="rounded-sf-lg border border-sf-border bg-white p-2"
        />
        <p className="font-sf-mono text-sm text-sf-fg">{ticket.code}</p>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-sf-lg border border-sf-border bg-sf-surface p-4 text-[13px]">
        <div className="col-span-2 flex flex-col gap-0.5">
          <dt className="text-sf-fg-subtle">Ingresso</dt>
          <dd className="font-semibold text-sf-fg">{ticket.offerName}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-sf-fg-subtle">Lote</dt>
          <dd className="text-sf-fg">{ticket.loteName}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-sf-fg-subtle">Titular</dt>
          <dd className="text-sf-fg">{ticket.buyerName}</dd>
        </div>
        {ticket.validity && (
          <div className="col-span-2 flex flex-col gap-0.5">
            <dt className="text-sf-fg-subtle">Validade</dt>
            <dd className="text-sf-fg">{formatValidity(ticket.validity)}</dd>
          </div>
        )}
      </dl>

      <p className="rounded-sf-md border border-sf-border bg-sf-bg-subtle p-3 text-[12px] leading-snug text-sf-fg-muted">
        Este ingresso é consumido no primeiro escaneamento válido.
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="flex-1 cursor-not-allowed rounded-sf-md border border-sf-border px-3 py-2 text-[12px] text-sf-fg-subtle"
        >
          Adicionar à carteira <span className="text-sf-fg-subtle">· em breve</span>
        </button>
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="flex-1 cursor-not-allowed rounded-sf-md border border-sf-border px-3 py-2 text-[12px] text-sf-fg-subtle"
        >
          Transferir <span className="text-sf-fg-subtle">· em breve</span>
        </button>
      </div>

      {hasMultiple && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIndex((current) => current - 1)}
            disabled={index === 0}
            className="flex-1 rounded-sf-md border border-sf-border px-3 py-2 text-[13px] text-sf-fg disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => setIndex((current) => current + 1)}
            disabled={index === tickets.length - 1}
            className="flex-1 rounded-sf-md border border-sf-border px-3 py-2 text-[13px] text-sf-fg disabled:cursor-not-allowed disabled:opacity-40"
          >
            Próximo
          </button>
        </div>
      )}
    </div>
  );
}
