import { HeroPreview } from "./hero-preview";

export function Hero() {
  return (
    <section className="marketing-section-glow-top relative overflow-hidden px-6 py-24 sm:py-28">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[12.5px] text-neutral-0/80">
          <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
          Infraestrutura de vendas para atrações e turismo
        </span>
        <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-neutral-0 sm:text-5xl">
          A infraestrutura de vendas para negócios presenciais com capacidade limitada
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-neutral-0/70">
          Zoológicos, aquários, museus, parques e atrações turísticas vendem, reservam, cobram e controlam acesso
          hoje espalhados entre WhatsApp, planilhas e sistemas desconectados. O Ingressafluxo reúne tudo isso em uma
          única plataforma.
        </p>
        <div className="flex gap-3 pt-1">
          <a
            href="#cta"
            className="btn-primary-gradient rounded-full px-7 py-3.5 text-[15.5px] font-bold shadow-[0_14px_34px_rgba(194,96,15,.35)]"
          >
            Começar agora
          </a>
          <a
            href="#como-funciona"
            className="rounded-full border border-white/15 bg-white/[0.07] px-7 py-3.5 text-[15.5px] font-semibold text-neutral-0 hover:bg-white/[0.14]"
          >
            Ver como funciona
          </a>
        </div>

        <div className="mt-8 flex w-full justify-center">
          <HeroPreview />
        </div>
      </div>
    </section>
  );
}
