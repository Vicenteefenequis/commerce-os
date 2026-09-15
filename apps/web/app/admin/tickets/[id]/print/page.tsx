import { redirect } from "next/navigation";
import { backendFetch } from "@/lib/backend-fetch";
import { PrintButton } from "./print-button";

interface TicketPrintContext {
  id: string;
  code: string;
  organizationName: string;
  organizationSlug: string;
  offerName: string;
  loteName: string;
  buyerName: string;
  validity?: { start: string; end: string };
}

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });
const TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

function formatValidity(validity: { start: string; end: string }): string {
  const start = new Date(validity.start);
  const end = new Date(validity.end);
  return `${DATE_FORMATTER.format(start)} ${TIME_FORMATTER.format(start)} - ${DATE_FORMATTER.format(end)} ${TIME_FORMATTER.format(end)}`;
}

/**
 * spec: ticketing/ticket-print. A receipt-width (58/80mm) printable
 * rendering of an issued Ticket, so a staff member can hand a physical
 * proof of entry to a visitor who did not receive one digitally - for a
 * counter sale, or for any other Ticket (spec - "Print view is available
 * for any issued Ticket"). Server-rendered: both the display context and
 * the QR image bytes are fetched here (forwarding the admin session
 * cookie), so the browser never needs a second authenticated request.
 */
export default async function TicketPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const contextRes = await backendFetch(`/tickets/${id}/print`);
  if (contextRes.status === 401) redirect("/admin/login");
  if (!contextRes.ok) {
    return (
      <main className="p-8">
        <p className="text-sm text-danger">Ingresso não encontrado.</p>
      </main>
    );
  }
  const ticket: TicketPrintContext = await contextRes.json();

  const qrRes = await backendFetch(`/tickets/${id}/qrcode`);
  const qrDataUri = qrRes.ok
    ? `data:image/png;base64,${Buffer.from(await qrRes.arrayBuffer()).toString("base64")}`
    : null;

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 bg-bg-subtle p-4 print:bg-white print:p-0">
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 0; }
          body { margin: 0; }
        }
      `}</style>

      <div className="print:hidden">
        <PrintButton />
      </div>

      <div className="w-[80mm] max-w-full rounded-md border border-border bg-white p-3 text-black print:w-[80mm] print:rounded-none print:border-0">
        <div className="flex flex-col items-center gap-1 border-b border-dashed border-black/30 pb-2 text-center">
          <p className="text-sm font-bold">{ticket.organizationName}</p>
          <p className="text-[10px] text-black/60">@{ticket.organizationSlug}</p>
        </div>

        <div className="flex flex-col items-center gap-2 py-3">
          {qrDataUri ? (
            // eslint-disable-next-line @next/next/no-img-element -- print output, not part of Next's optimized image pipeline
            <img src={qrDataUri} alt={`QR do ingresso ${ticket.code}`} width={180} height={180} />
          ) : (
            <p className="text-xs">QR indisponível</p>
          )}
          <p className="font-mono text-xs">{ticket.code}</p>
        </div>

        <div className="flex flex-col gap-1 border-t border-dashed border-black/30 pt-2 text-[11px]">
          <p>
            <span className="font-semibold">Ingresso:</span> {ticket.offerName}
          </p>
          <p>
            <span className="font-semibold">Lote:</span> {ticket.loteName}
          </p>
          <p>
            <span className="font-semibold">Titular:</span> {ticket.buyerName}
          </p>
          {ticket.validity && (
            <p>
              <span className="font-semibold">Validade:</span> {formatValidity(ticket.validity)}
            </p>
          )}
        </div>

        <p className="mt-2 border-t border-dashed border-black/30 pt-2 text-center text-[10px] text-black/60">
          Ingresso consumido no primeiro escaneamento válido.
        </p>
      </div>
    </div>
  );
}
