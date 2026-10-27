import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";
import { operationalDateWIB } from "@/lib/format";

export const dynamic = "force-dynamic";

type RecapRow = {
  op_date: string;
  siang: number;
  malam: number;
  luar: number;
  total: number;
};

// GET /api/shifts/revenue — the running total for the current operational day
// (WIB, 02:00 cut-off), derived from actual paid orders. This is what the
// cashier sidebar shows as "Pendapatan Hari Ini". It used to be a per-tab
// sessionStorage counter, which read 0 on any other tab, device, or after a
// re-login even though the orders were safely in the database.
//
// Deliberately the same RPC the owner recap uses, so the cashier and the owner
// can never disagree about the same day's revenue.
export async function GET() {
  const db = createDbClient();
  const { data, error } = await db.rpc("shift_revenue_recap", {
    p_days: 1,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const operationalDate = operationalDateWIB();
  const today = ((data as RecapRow[]) ?? []).find(
    (r) => r.op_date === operationalDate,
  );

  return NextResponse.json({
    data: {
      operationalDate,
      total: Number(today?.total ?? 0),
      siang: Number(today?.siang ?? 0),
      malam: Number(today?.malam ?? 0),
      luar: Number(today?.luar ?? 0),
    },
  });
}
