import { AdminNav } from "@/components/layout/admin-nav";
import { backendFetch } from "@/lib/backend-fetch";
import { DashboardContent } from "./dashboard-content";

export interface DashboardSummary {
  sales: { gmvCents: number; averageOrderValueCents: number };
  orders: { countsByStatus: Record<string, number> };
  visitors: { authorizedCount: number };
}

export interface VenueOption {
  id: string;
  name: string;
}

type Period = "today" | "7d" | "30d" | "custom";

function resolveRange(period: Period, from?: string, to?: string): { from: string; to: string } {
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  if (period === "custom" && from && to) {
    return { from, to };
  }
  if (period === "7d") {
    return { from: new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), to: endOfToday.toISOString() };
  }
  if (period === "30d") {
    return { from: new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), to: endOfToday.toISOString() };
  }
  return { from: startOfToday.toISOString(), to: endOfToday.toISOString() };
}

/** spec: admin/dashboard - "Dashboard is the default admin landing screen". */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; venueId?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const period = (["today", "7d", "30d", "custom"].includes(params.period ?? "") ? params.period : "7d") as Period;
  const { from, to } = resolveRange(period, params.from, params.to);
  const venueId = params.venueId ?? "";

  const query = new URLSearchParams({ from, to });
  if (venueId) query.set("venueId", venueId);

  const [summaryRes, venuesRes] = await Promise.all([
    backendFetch(`/dashboard/summary?${query.toString()}`),
    backendFetch("/venues"),
  ]);

  const summary: DashboardSummary | null = summaryRes.ok ? await summaryRes.json() : null;
  const venuesBody = venuesRes.ok ? await venuesRes.json() : { venues: [] };
  const venues: VenueOption[] = venuesBody.venues ?? [];

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl p-8">
        <DashboardContent summary={summary} venues={venues} period={period} venueId={venueId} from={from} to={to} />
      </main>
    </>
  );
}
