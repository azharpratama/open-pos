import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";
import { todayWIB } from "@/lib/format";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/salary?date= — computed salary for the date + whether it's been
// recorded into purchases yet.
export async function GET(request: Request) {
  const param = new URL(request.url).searchParams.get("date");
  const date = param && DATE_RE.test(param) ? param : todayWIB();

  const db = createDbClient();
  const { data, error } = await db.rpc("daily_salary", { p_date: date });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const row = data?.[0];
  const { data: existing } = await db
    .from("purchases")
    .select("id")
    .eq("purchase_date", date)
    .eq("kind", "gaji")
    .maybeSingle();

  return NextResponse.json({
    data: {
      date,
      total: Number(row?.total ?? 0),
      employeeCount: Number(row?.employee_count ?? 0),
      recorded: Boolean(existing),
    },
  });
}

// POST /api/salary { date } — records the day's salary as a 'gaji' purchase.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const b = body as Record<string, unknown>;
  const date =
    typeof b.date === "string" && DATE_RE.test(b.date) ? b.date : todayWIB();

  const db = createDbClient();
  const { data, error } = await db.rpc("record_daily_salary", {
    p_date: date,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const row = data?.[0];
  return NextResponse.json({
    data: {
      date,
      total: Number(row?.total ?? 0),
      employeeCount: Number(row?.employee_count ?? 0),
    },
  });
}
