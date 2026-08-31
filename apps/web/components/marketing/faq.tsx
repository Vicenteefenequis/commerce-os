const QUESTIONS = [
  {
    question: "A plataforma já está em produção?",
    answer:
      "Estamos na fase de construção do MVP e selecionando estabelecimentos piloto. Ao entrar em contato, alinhamos com você o que já está disponível e o cronograma para o seu caso.",
  },
  {
    question: "Preciso trocar todos os meus sistemas de uma vez?",
    answer:
      "Não. A plataforma é modular — você pode adotar só o ticketing, ticketing + pagamentos, ou o controle de acesso, de acordo com o que fizer sentido para o seu estabelecimento.",
  },
  {
    question: "Funciona para o meu tipo de negócio?",
    answer:
      "O foco inicial é atrações, turismo e entretenimento presencial com capacidade limitada: zoológicos, aquários, museus, parques, fazendas turísticas e afins.",
  },
  {
    question: "Como funciona o programa piloto?",
    answer:
      "Preencha o formulário abaixo com os dados do seu estabelecimento. Nosso time entra em contato para entender sua operação e definir os próximos passos junto com você.",
  },
];

export function FAQ() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h2 className="mb-10 text-2xl font-semibold text-fg">Perguntas frequentes</h2>
      <div className="flex flex-col divide-y divide-border">
        {QUESTIONS.map((item) => (
          <details key={item.question} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-fg">
              {item.question}
              <span className="text-fg-muted transition-transform group-open:rotate-180" aria-hidden="true">
                ▾
              </span>
            </summary>
            <p className="mt-3 text-sm text-fg-muted">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
