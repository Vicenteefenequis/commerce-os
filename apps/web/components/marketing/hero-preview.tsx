const FLOW_STEPS = [
  { label: "Oferta publicada", description: "Produto, preço e janela de disponibilidade no ar.", tone: "primary" as const },
  { label: "Checkout", description: "Pagamento sem cadastro, direto no link público.", tone: "primary" as const },
  { label: "Ticket + QR emitido", description: "Emissão imediata, válida offline na portaria.", tone: "primary" as const },
  { label: "Acesso liberado", description: "Capacidade baixada na mesma fonte da verdade.", tone: "success" as const },
];

const SALES_BARS = [38, 52, 44, 66, 58, 80, 49, 71, 100, 62, 46, 84, 55, 68];

const SALES_STATS = [
  { label: "Pedidos", value: "8.511" },
  { label: "Ocupação média", value: "73%" },
];

/**
 * Hero capability mockup (design.md D3): illustrates what the platform does
 * today — a four-step flow strip, a sales overview, and an access-check
 * panel — as static markup with stylized, rounded figures. Not a live embed
 * of the real admin dashboard (see design.md D3 for why).
 */
export function HeroPreview() {
  return (
    <div className="flex w-full max-w-3xl flex-col gap-5 rounded-[22px] border border-white/15 bg-gradient-to-b from-white/10 to-white/5 p-6 text-left backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4">
        <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-400">
          Um fluxo, quatro etapas
        </span>
        <span className="font-mono text-[11px] text-neutral-500">oferta → acesso</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FLOW_STEPS.map((step, index) => (
          <div
            key={step.label}
            className="flex flex-col gap-2.5 rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <span
              className={
                step.tone === "success"
                  ? "flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-success/40 bg-success/15 text-[13px] font-bold text-success"
                  : "flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-primary/40 bg-primary/15 text-[13px] font-bold text-primary-400"
              }
            >
              {index + 1}
            </span>
            <span className="text-[15px] font-semibold text-neutral-0">{step.label}</span>
            <span className="text-xs leading-relaxed text-neutral-400">{step.description}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-4 rounded-2xl bg-neutral-800 p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-400">
              Vendas · 30 dias
            </span>
            <div className="inline-flex gap-0.5 rounded-full border border-white/10 bg-white/5 p-0.5">
              <span className="rounded-full bg-neutral-0 px-3 py-1 text-xs font-semibold text-neutral-950">
                Mês
              </span>
              <span className="px-3 py-1 text-xs text-neutral-400">Ano</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-extrabold tracking-tight text-neutral-0 tabular-nums">
              R$ 128.000,16
            </span>
            <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-bold text-success">
              +18,4%
            </span>
          </div>
          <div className="flex h-[74px] items-end gap-1" aria-hidden="true">
            {SALES_BARS.map((height, index) => (
              <div key={index} className="flex-1 rounded-sm bg-primary-600" style={{ height: `${height}%` }} />
            ))}
          </div>
          <div className="flex gap-6 border-t border-white/10 pt-3.5">
            {SALES_STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1">
                <span className="text-xs text-neutral-400">{stat.label}</span>
                <span className="text-[17px] font-bold text-neutral-0 tabular-nums">{stat.value}</span>
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-neutral-400">Overbooking</span>
              <span className="text-[17px] font-bold text-success">0</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3.5 rounded-2xl bg-neutral-800 p-5">
          <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-400">Portaria</span>
          <div className="flex items-center gap-3.5">
            <div
              aria-hidden="true"
              className="h-[62px] w-[62px] flex-none rounded-lg bg-neutral-0 bg-[repeating-linear-gradient(90deg,#0b1030_0_4px,#fff_4px_8px),repeating-linear-gradient(0deg,rgba(11,16,48,.5)_0_4px,transparent_4px_8px)]"
            />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-neutral-0">Inteira · 2 pessoas</span>
              <span className="text-xs text-neutral-400">Sáb, 12 set · 10:30</span>
            </div>
          </div>
          <div className="mt-auto flex flex-col gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3.5 py-3">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
              <span className="text-sm font-semibold text-success">Acesso liberado</span>
            </div>
            <span className="text-xs leading-relaxed text-neutral-400">
              Resposta clara na portaria, mesmo sem internet.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
