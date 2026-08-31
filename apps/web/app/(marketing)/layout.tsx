import type { ReactNode } from "react";
import { MarketingHeader } from "@/components/marketing/site-header";
import { MarketingFooter } from "@/components/marketing/site-footer";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
