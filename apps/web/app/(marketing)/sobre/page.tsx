export const metadata = {
  title: "Sobre — Ingressafluxo",
  description: "Conheça a visão e a tese por trás do Ingressafluxo.",
};

export default function SobrePage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="mb-6 text-3xl font-semibold text-fg">Sobre o Ingressafluxo</h1>
      <div className="flex flex-col gap-6 text-fg-muted">
        <p>
          O Ingressafluxo é uma plataforma de infraestrutura operacional e comercial para negócios presenciais que
          precisam vender, reservar, cobrar, controlar capacidade, validar acesso e manter relacionamento recorrente
          com seus clientes.
        </p>
        <p>
          A primeira vertical atendida é a de atrações, turismo e entretenimento presencial: zoológicos, aquários,
          museus, parques, fazendas turísticas, jardins botânicos e experiências com horário ou capacidade limitada.
        </p>
        <p>
          O produto não é pensado como um simples sistema de ingressos. A visão é construir uma infraestrutura capaz
          de controlar progressivamente todo o ciclo — da descoberta à recorrência — para que cada novo
          estabelecimento, consumidor e transação gere mais valor para os demais participantes do ecossistema.
        </p>
        <p>
          Hoje estamos construindo o MVP e selecionando os primeiros estabelecimentos piloto. Se isso faz sentido
          para o seu negócio, entre em contato pela página inicial.
        </p>
      </div>
    </section>
  );
}
