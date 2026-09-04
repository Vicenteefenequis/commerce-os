const QUESTIONS = [
  {
    question: "A plataforma já está em produção?",
    answer:
      "Sim. O núcleo de ofertas, capacidade, checkout e emissão de tickets com QR Code já roda em operação real, com estabelecimentos selecionados. Ao entrar em contato, alinhamos com você o que já está disponível e o cronograma para o seu caso.",
  },
  {
    question: "Preciso trocar todos os meus sistemas de uma vez?",
    answer:
      "Não. A plataforma é modular — você pode adotar só o ticketing, ticketing + pagamentos, ou o controle de acesso, de acordo com o que fizer sentido para o seu estabelecimento.",
  },
  {
    question: "Funciona para o meu tipo de negócio?",
    answer:
      "Se você vende acesso com capacidade limitada por data ou horário — zoológico, aquário, museu, parque, fazenda turística ou atração similar — o modelo se aplica.",
  },
  {
    question: "Como funciona o processo de entrada na plataforma?",
    answer:
      "Preencha o formulário abaixo com os dados do seu estabelecimento. Nosso time entra em contato para entender sua operação e conduzir a implantação junto com você.",
  },
];

export function FAQ() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h2 className="mb-10 text-3xl font-extrabold tracking-tight text-fg">Perguntas frequentes</h2>
      <div className="flex flex-col gap-3">
        {QUESTIONS.map((item) => (
          <details
            key={item.question}
            className="group rounded-2xl border border-border bg-surface px-6 py-5"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold text-fg">
              {item.question}
              <span
                className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-border bg-bg-subtle text-sm text-primary-600 transition-transform group-open:rotate-45"
                aria-hidden="true"
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-[15.5px] leading-relaxed text-fg-muted">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
