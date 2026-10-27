import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";
import { currentShift, operationalDateWIB } from "@/lib/format";

// The kasir cashier dropdown is driven by the shift that is active RIGHT NOW
// (WIB): the employees assigned to the current shift block (SIANG 09:00–17:00 or
// MALAM 17:00–02:00) on the operational date. Outside operating hours (the cafe
// is closed, 02:00–09:00) there is no roster, so orders are booked against a
// single fixed "outside hours" cashier instead of someone else's name.
export const dynamic = "force-dynamic";

// Sentinel cashier for orders taken while the cafe is closed. Kept in sync with
// the recap's LUAR window so such orders show as "Pendapatan diluar jam
// operasional" on the owner dashboard rather than under a rostered cashier.
export const OUTSIDE_HOURS_CASHIER = "Pembelian diluar jam operasional";

export async function GET() {
  const workDate = operationalDateWIB();
  const shift = currentShift();

  // Closed hours (02:00–09:00): no one is rostered — force the outside-hours
  // cashier as the only option.
  if (!shift) {
    return NextResponse.json({
      date: workDate,
      shiftType: null,
      data: [{ id: "outside", name: OUTSIDE_HOURS_CASHIER }],
    });
  }

  const db = createDbClient();
  const { data: blocks, error } = await db
    .from("shift_schedules")
    .select("employee_ids")
    .eq("work_date", workDate)
    .eq("shift_type", shift.type);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = [
    ...new Set(
      (blocks ?? []).flatMap((b) => (b.employee_ids as string[] | null) ?? []),
    ),
  ];

  let entries: { id: string; name: string }[] = [];
  if (ids.length > 0) {
    const { data: emps, error: empErr } = await db
      .from("employees")
      .select("id, name")
      .in("id", ids)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (empErr) {
      return NextResponse.json({ error: empErr.message }, { status: 500 });
    }
    entries = (emps ?? []).map((e) => ({ id: e.id, name: e.name }));
  }

  return NextResponse.json({ date: workDate, shiftType: shift.type, data: entries });
}
