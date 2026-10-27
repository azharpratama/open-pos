export type TrendPoint = { day: string; revenue: number };

export type DashboardSummary = {
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  expenseToday: number;
  expenseWeek: number;
  expenseMonth: number;
  profitToday: number;
  profitWeek: number;
  profitMonth: number;
  txToday: number;
  trend: TrendPoint[];
};

export async function fetchDashboard(): Promise<DashboardSummary> {
  const res = await fetch("/api/dashboard/summary", { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Gagal memuat ringkasan");
  return json.data as DashboardSummary;
}

export type Granularity = "daily" | "weekly" | "monthly";
export type TrendMetric = "revenue" | "expense";
export type TrendSeriesPoint = { bucket: string; value: number };

export async function fetchTrend(
  granularity: Granularity,
  metric: TrendMetric = "revenue",
): Promise<TrendSeriesPoint[]> {
  const res = await fetch(
    `/api/dashboard/trend?granularity=${granularity}&metric=${metric}`,
    { cache: "no-store" },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Gagal memuat tren");
  return json.data as TrendSeriesPoint[];
}
