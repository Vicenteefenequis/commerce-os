const POINTS = [
  {
    title: "Não é só ticketing",
    description:
      "A maior parte dos sistemas emite ingressos. O Ingressafluxo controla a transação inteira e o contexto operacional: quem comprou, quando, quanto pagou, se compareceu e quando deve comprar de novo.",
    swatch: "bg-primary/20 border-primary/40",
  },
  {
    title: "Capacidade como fonte única da verdade",
    description:
      "A disponibilidade não é recalculada de forma independente pelo site, pelo checkout e pela portaria — evitando overbooking e divergência entre canais.",
    swatch: "bg-[rgba(110,146,255,.18)] border-[rgba(110,146,255,.4)]",
  },
  {
    title: "Modular",
    description:
      "Use só o que precisa: ticketing isolado, ticketing + pagamentos, ou o ecossistema completo com controle de acesso.",
    swatch: "bg-success/15 border-success/35",
  },
  {
    title: "API-first e multi-tenant desde a fundação",
    description:
      "Cada capacidade tem um contrato explícito, e cada estabelecimento tem isolamento de dados garantido desde o primeiro dia.",
    swatch: "bg-white/10 border-white/25",
  },
];

export function Differentiator() {
  return (
    <section className="marketing-section-dark px-6 py-24">
      <div className="mx-auto flex max-w-6xl flex-col gap-11">
        <div className="flex max-w-xl flex-col gap-3.5">
          <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-primary-400">
            O que você recebe
          </span>
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-neutral-0">
            Controle da transação, não só do ingresso
          </h2>
          <p className="text-lg leading-relaxed text-neutral-0/70">
            O valor não está em controlar ingressos. Está em controlar a transação e a operação ao redor dela.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {POINTS.map((point) => (
            <div
              key={point.title}
              className="flex flex-col gap-3.5 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.03] p-7"
            >
              <span
                className={`h-10 w-10 rounded-xl border ${point.swatch}`}
                aria-hidden="true"
              />
              <h3 className="text-xl font-bold tracking-tight text-neutral-0">{point.title}</h3>
              <p className="text-[15.5px] leading-relaxed text-neutral-0/70">{point.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
