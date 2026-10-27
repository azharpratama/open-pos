import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";

export const dynamic = "force-dynamic";

type SummaryRow = {
  revenue_today: number;
  revenue_week: number;
  revenue_month: number;
  expense_today: number;
  expense_week: number;
  expense_month: number;
  tx_today: number;
};

type TrendRow = { day: string; revenue: number };

export async function GET() {
  const db = createDbClient();
  const [summaryRes, trendRes] = await Promise.all([
    db.rpc("dashboard_summary"),
    db.rpc("revenue_last_days", { p_days: 7 }),
  ]);

  if (summaryRes.error) {
    return NextResponse.json({ error: summaryRes.error.message }, { status: 500 });
  }
  if (trendRes.error) {
    return NextResponse.json({ error: trendRes.error.message }, { status: 500 });
  }

  const s = (summaryRes.data?.[0] ?? {}) as Partial<SummaryRow>;
  const revenueToday = Number(s.revenue_today ?? 0);
  const revenueWeek = Number(s.revenue_week ?? 0);
  const revenueMonth = Number(s.revenue_month ?? 0);
  const expenseToday = Number(s.expense_today ?? 0);
  const expenseWeek = Number(s.expense_week ?? 0);
  const expenseMonth = Number(s.expense_month ?? 0);

  const trend = ((trendRes.data ?? []) as TrendRow[]).map((r) => ({
    day: r.day,
    revenue: Number(r.revenue),
  }));

  return NextResponse.json({
    data: {
      revenueToday,
      revenueWeek,
      revenueMonth,
      expenseToday,
      expenseWeek,
      expenseMonth,
      profitToday: revenueToday - expenseToday,
      profitWeek: revenueWeek - expenseWeek,
      profitMonth: revenueMonth - expenseMonth,
      txToday: Number(s.tx_today ?? 0),
      trend,
    },
  });
}
