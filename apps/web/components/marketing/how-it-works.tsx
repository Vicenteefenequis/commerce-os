const STEPS = [
  {
    title: "Cadastre sua oferta",
    description: "Configure produtos, preços e janela de disponibilidade do seu estabelecimento.",
  },
  {
    title: "Configure a capacidade",
    description: "Defina a capacidade máxima por recurso e período, com prevenção automática de overbooking.",
  },
  {
    title: "Venda",
    description: "Seu cliente reserva e paga sem precisar de conta, direto pelo checkout público.",
  },
  {
    title: "Receba",
    description: "O pagamento é processado e conciliado automaticamente, sem planilha manual.",
  },
  {
    title: "Controle o acesso",
    description: "Cada ingresso emitido carrega um QR Code que autoriza a entrada, com resposta clara na portaria.",
  },
  {
    title: "Acompanhe",
    description: "Visualize vendas, pedidos e visitantes em um único painel.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-11 flex flex-col gap-3.5 max-w-xl">
        <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-primary-600">
          Como funciona
        </span>
        <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-fg">
          Do cadastro da oferta até o visitante entrando
        </h2>
        <p className="text-lg leading-relaxed text-fg-muted">
          Do cadastro da oferta até o visitante entrando no seu estabelecimento, tudo em um único fluxo.
        </p>
      </div>
      <ol className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-7">
            <span className="font-mono text-xs font-medium text-primary-600">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="text-lg font-bold tracking-tight text-fg">{step.title}</h3>
            <p className="text-[15px] leading-relaxed text-fg-muted">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
