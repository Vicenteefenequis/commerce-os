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
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-10 flex flex-col gap-3">
        <h2 className="text-2xl font-semibold text-fg">Como funciona</h2>
        <p className="max-w-2xl text-fg-muted">
          Do cadastro da oferta até o visitante entrando no seu estabelecimento, tudo em um único fluxo.
        </p>
      </div>
      <ol className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-6">
            <span className="text-sm font-semibold text-primary">{String(index + 1).padStart(2, "0")}</span>
            <h3 className="font-semibold text-fg">{step.title}</h3>
            <p className="text-sm text-fg-muted">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
