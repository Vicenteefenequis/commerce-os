const POINTS = [
  {
    title: "Não é só ticketing",
    description:
      "A maior parte dos sistemas emite ingressos. O Ingressafluxo controla a transação inteira e o contexto operacional: quem comprou, quando, quanto pagou, se compareceu e quando deve comprar de novo.",
  },
  {
    title: "Capacidade como fonte única da verdade",
    description:
      "A disponibilidade não é recalculada de forma independente pelo site, pelo checkout e pela portaria — evitando overbooking e divergência entre canais.",
  },
  {
    title: "Modular",
    description:
      "Use só o que precisa: ticketing isolado, ticketing + pagamentos, ou o ecossistema completo com controle de acesso.",
  },
  {
    title: "API-first e multi-tenant desde a fundação",
    description:
      "Cada capacidade tem um contrato explícito, e cada estabelecimento tem isolamento de dados garantido desde o primeiro dia.",
  },
];

export function Differentiator() {
  return (
    <section className="bg-bg-subtle">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10 flex flex-col gap-3">
          <h2 className="text-2xl font-semibold text-fg">O que você recebe</h2>
          <p className="max-w-2xl text-fg-muted">
            O valor não está em controlar ingressos. Está em controlar a transação e a operação ao redor dela.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {POINTS.map((point) => (
            <div key={point.title} className="rounded-lg border border-border bg-surface p-6">
              <h3 className="mb-2 font-semibold text-fg">{point.title}</h3>
              <p className="text-sm text-fg-muted">{point.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
