const STEPS = [
  { label: "Oferta publicada" },
  { label: "Checkout" },
  { label: "Ticket + QR emitido" },
  { label: "Acesso liberado" },
];

/**
 * Simplified mockup of the platform flow (design.md - Hero animation
 * decision): a CSS-only step sequence, not a recording of the real
 * product, since the transactional flow isn't built yet.
 */
export function HeroFlowAnimation() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-6 sm:flex-row sm:items-center sm:gap-0"
    >
      {STEPS.map((step, index) => (
        <div key={step.label} className="flex flex-1 items-center gap-3">
          <div className="flex flex-1 flex-col items-center gap-2 text-center">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-fg-on-primary opacity-0 [animation:hero-flow-step_4s_ease-in-out_infinite]"
              style={{ animationDelay: `${index * 1}s` }}
            >
              {index + 1}
            </div>
            <span className="text-xs text-fg-muted">{step.label}</span>
          </div>
          {index < STEPS.length - 1 && (
            <span className="hidden text-fg-muted sm:block" aria-hidden="true">
              &rarr;
            </span>
          )}
        </div>
      ))}
      <style>{`
        @keyframes hero-flow-step {
          0% { opacity: 0; transform: scale(0.85); }
          10% { opacity: 1; transform: scale(1); }
          85% { opacity: 1; transform: scale(1); }
          100% { opacity: 0.35; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
