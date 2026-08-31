import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Differentiator } from "@/components/marketing/differentiator";
import { FAQ } from "@/components/marketing/faq";
import { CtaSection } from "@/components/marketing/cta-section";

export const metadata = {
  title: "Commerce OS — Venda e controle acesso em negócios presenciais",
  description:
    "A infraestrutura de vendas, capacidade e acesso para negócios presenciais com capacidade limitada: zoológicos, aquários, museus, parques e atrações turísticas.",
};

export default function LandingPage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Differentiator />
      <FAQ />
      <CtaSection />
    </>
  );
}
