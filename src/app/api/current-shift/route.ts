import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";
import { currentShift, operationalDateWIB } from "@/lib/format";

export const dynamic = "force-dynamic";

// GET /api/current-shift — the active shift right now (WIB) + who's assigned to
// it on the operational date. shiftType is null when the cafe is closed.
export async function GET() {
  const shift = currentShift();
  const date = operationalDateWIB();

  if (!shift) {
    return NextResponse.json({
      data: { date, shiftType: null, startTime: null, endTime: null, cashiers: [] },
    });
  }

  const db = createDbClient();
  const { data, error } = await db
    .from("shift_schedules")
    .select("employee_ids")
    .eq("work_date", date)
    .eq("shift_type", shift.type);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = [
    ...new Set(
      (data ?? []).flatMap((r) => (r.employee_ids as string[] | null) ?? []),
    ),
  ];

  let cashiers: string[] = [];
  if (ids.length > 0) {
    const { data: emps } = await db
      .from("employees")
      .select("name")
      .in("id", ids)
      .order("name", { ascending: true });
    cashiers = (emps ?? []).map((e) => e.name);
  }

  return NextResponse.json({
    data: {
      date,
      shiftType: shift.type,
      startTime: shift.start,
      endTime: shift.end,
      cashiers,
    },
  });
}
