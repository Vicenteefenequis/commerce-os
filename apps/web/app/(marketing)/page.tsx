import { Hero } from "@/components/marketing/hero";
import { TenantSearch } from "@/components/marketing/tenant-search";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Differentiator } from "@/components/marketing/differentiator";
import { FAQ } from "@/components/marketing/faq";
import { CtaSection } from "@/components/marketing/cta-section";

export const metadata = {
  title: "Ingressafluxo — Venda e controle acesso em negócios presenciais",
  description:
    "A infraestrutura de vendas, capacidade e acesso para negócios presenciais com capacidade limitada: zoológicos, aquários, museus, parques e atrações turísticas.",
};

export default function LandingPage() {
  return (
    <>
      <Hero />
      <TenantSearch />
      <HowItWorks />
      <Differentiator />
      <FAQ />
      <CtaSection />
    </>
  );
}
