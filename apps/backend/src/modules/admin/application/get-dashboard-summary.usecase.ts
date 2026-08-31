import type { DashboardSummary, DashboardSummaryQuery, DashboardSummaryRepositoryPort } from "../domain/dashboard-summary.js";

/** spec: admin/dashboard - "Dashboard summary is scoped by tenant, venue, and period". */
export class GetDashboardSummaryUseCase {
  constructor(private readonly summaries: DashboardSummaryRepositoryPort) {}

  async execute(query: DashboardSummaryQuery): Promise<DashboardSummary> {
    return this.summaries.getSummary(query);
  }
}
