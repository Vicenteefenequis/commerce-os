import { LeadForm } from "./lead-form";

const HIGHLIGHTS = [
  "Implantação acompanhada, sem trocar tudo de uma vez",
  "Isolamento de dados por estabelecimento",
  "Suporte direto do time durante o onboarding",
];

export function CtaSection() {
  return (
    <section id="cta" className="marketing-section-glow-bottom px-6 py-24">
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2 lg:items-center">
        <div className="flex flex-col gap-4">
          <span className="font-mono text-[11px] uppercase tracking-wider text-primary-400">
            Fale com nosso time
          </span>
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-neutral-0">
            Comece a vender e controlar acesso hoje
          </h2>
          <p className="max-w-md text-lg leading-relaxed text-neutral-0/70">
            Deixe seus dados e nosso time entra em contato para entender sua operação.
          </p>
          <ul className="flex flex-col gap-2.5 pt-2">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-[14.5px] text-neutral-0/75">
                <span className="h-1.5 w-1.5 flex-none rounded-full bg-success" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="w-full">
          <LeadForm />
        </div>
      </div>
    </section>
  );
}
