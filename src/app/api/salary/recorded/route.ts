import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/salary/recorded?from=&to= — the dates within the range whose salary
// has already been recapped (i.e. a 'gaji' purchase exists). Used by the shift
// calendar to flag days that are saved but not yet recapped.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json(
      { error: "from & to (YYYY-MM-DD) wajib" },
      { status: 400 },
    );
  }

  const db = createDbClient();
  const { data, error } = await db
    .from("purchases")
    .select("purchase_date")
    .eq("kind", "gaji")
    .gte("purchase_date", from)
    .lte("purchase_date", to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const dates = [
    ...new Set((data as { purchase_date: string }[]).map((r) => r.purchase_date)),
  ];
  return NextResponse.json({ data: dates });
}
