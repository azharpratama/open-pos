import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";

export const dynamic = "force-dynamic";

type RecapRow = {
  op_date: string;
  siang: number;
  malam: number;
  luar: number;
  total: number;
  siang_running: boolean;
  malam_running: boolean;
  siang_names: string[] | null;
  malam_names: string[] | null;
};

// GET /api/shifts/recap — per-day shift revenue recap, derived from actual paid
// orders (same source as the revenue trend) split into the siang (09:00–17:00),
// malam (17:00–02:00) and luar (outside operating hours, 02:00–09:00) windows,
// so the recap always matches the trend.
export async function GET() {
  const db = createDbClient();
  const { data, error } = await db.rpc("shift_revenue_recap", {
    p_days: 14,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: ((data as RecapRow[]) ?? []).map((r) => ({
      operationalDate: r.op_date,
      siang: Number(r.siang),
      malam: Number(r.malam),
      luar: Number(r.luar),
      total: Number(r.total),
      siangRunning: r.siang_running,
      malamRunning: r.malam_running,
      siangNames: r.siang_names ?? [],
      malamNames: r.malam_names ?? [],
    })),
  });
}
