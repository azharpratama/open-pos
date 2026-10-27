import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Fixed operational shifts. MALAM crosses midnight but belongs to its start date.
const TIMES = {
  SIANG: { start: "09:00", end: "17:00" },
  MALAM: { start: "17:00", end: "02:00" },
} as const;

type BlockRow = {
  work_date: string;
  shift_type: string;
  employee_ids: string[];
};

// GET /api/shift-schedules?from=&to= — assigned slots within the date range.
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
    .from("shift_schedules")
    .select("work_date, shift_type, employee_ids")
    .gte("work_date", from)
    .lte("work_date", to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data: (data as BlockRow[]).map((r) => ({
      workDate: r.work_date,
      shiftType: r.shift_type,
      employeeIds: r.employee_ids ?? [],
    })),
  });
}

// POST /api/shift-schedules { workDate, shiftType, employeeIds } — replaces the
// assignment for a (date, shift) slot.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const workDate =
    typeof b.workDate === "string" && DATE_RE.test(b.workDate) ? b.workDate : "";
  const shiftType =
    b.shiftType === "SIANG" || b.shiftType === "MALAM" ? b.shiftType : "";
  if (!workDate) {
    return NextResponse.json({ error: "workDate tidak valid" }, { status: 400 });
  }
  if (!shiftType) {
    return NextResponse.json(
      { error: "shiftType harus SIANG atau MALAM" },
      { status: 400 },
    );
  }
  const employeeIds = Array.isArray(b.employeeIds)
    ? b.employeeIds.filter((x): x is string => typeof x === "string")
    : [];

  const db = createDbClient();
  await db
    .from("shift_schedules")
    .delete()
    .eq("work_date", workDate)
    .eq("shift_type", shiftType);

  if (employeeIds.length > 0) {
    const times = TIMES[shiftType];
    const { error } = await db.from("shift_schedules").insert({
      work_date: workDate,
      shift_type: shiftType,
      start_time: times.start,
      end_time: times.end,
      employee_ids: employeeIds,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data: { workDate, shiftType, employeeIds } });
}
