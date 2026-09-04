import { HeroFlowAnimation } from "./hero-flow-animation";

export function Hero() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-16 pt-20 lg:flex-row lg:items-center lg:pt-28">
      <div className="flex flex-1 flex-col gap-6">
        <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          A infraestrutura de vendas para negócios presenciais com capacidade limitada
        </h1>
        <p className="max-w-xl text-lg text-fg-muted">
          Zoológicos, aquários, museus, parques e atrações turísticas vendem, reservam, cobram e controlam acesso
          hoje espalhados entre WhatsApp, planilhas e sistemas desconectados. O Ingressafluxo reúne tudo isso em uma
          única plataforma.
        </p>
        <div>
          <a
            href="#cta"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-fg-on-primary hover:bg-primary-hover active:bg-primary-active"
          >
            Quero ser piloto
          </a>
        </div>
      </div>
      <div className="flex-1">
        <HeroFlowAnimation />
      </div>
    </section>
  );
}
