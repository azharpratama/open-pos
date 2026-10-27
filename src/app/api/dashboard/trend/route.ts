import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";

export const dynamic = "force-dynamic";

const BUCKETS: Record<string, number> = { daily: 14, weekly: 12, monthly: 12 };

// GET /api/dashboard/trend?granularity=daily|weekly|monthly&metric=revenue|expense
// — a value series for the dashboard trend charts.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const raw = params.get("granularity") ?? "daily";
  const granularity = raw === "weekly" || raw === "monthly" ? raw : "daily";
  const metric = params.get("metric") === "expense" ? "expense" : "revenue";

  const db = createDbClient();
  const { data, error } = await db.rpc(
    metric === "expense" ? "expense_trend" : "revenue_trend",
    { p_granularity: granularity, p_buckets: BUCKETS[granularity] },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    granularity,
    metric,
    data: ((data as { bucket: string; revenue?: number; expense?: number }[]) ?? []).map(
      (r) => ({ bucket: r.bucket, value: Number(r.revenue ?? r.expense ?? 0) }),
    ),
  });
}
