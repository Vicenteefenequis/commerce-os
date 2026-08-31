import { LeadForm } from "./lead-form";

export function CtaSection() {
  return (
    <section id="cta" className="bg-bg-subtle">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 px-6 py-16 text-center">
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl font-semibold text-fg">Quer ser um dos estabelecimentos piloto?</h2>
          <p className="max-w-xl text-fg-muted">
            Deixe seus dados e nosso time entra em contato para entender sua operação.
          </p>
        </div>
        <div className="w-full max-w-md text-left">
          <LeadForm />
        </div>
      </div>
    </section>
  );
}
