import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";

export const dynamic = "force-dynamic";

type ReservationRow = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  floor_number: number;
  reservation_date: string;
  start_time: string;
  end_time: string;
  minimum_spend: number;
  deposit_amount: number;
  deposit_method: string | null;
  status: string;
  notes: string | null;
  order_id: string | null;
  created_at: string;
};

function mapRow(r: ReservationRow) {
  return {
    id: r.id,
    customerName: r.customer_name,
    customerPhone: r.customer_phone ?? undefined,
    floorNumber: r.floor_number,
    reservationDate: r.reservation_date,
    startTime: r.start_time?.slice(0, 5), // HH:MM
    endTime: r.end_time?.slice(0, 5),
    minimumSpend: Number(r.minimum_spend),
    depositAmount: Number(r.deposit_amount),
    depositMethod: r.deposit_method ?? undefined,
    status: r.status,
    notes: r.notes ?? undefined,
    orderId: r.order_id ?? undefined,
    createdAt: r.created_at,
  };
}

// GET /api/reservations?date=YYYY-MM-DD&startDate=...&endDate=...&floor=N
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const floor = searchParams.get("floor");

  const db = createDbClient();
  let query = db
    .from("reservations")
    .select("*")
    .order("reservation_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (date) {
    query = query.eq("reservation_date", date);
  } else {
    if (startDate) query = query.gte("reservation_date", startDate);
    if (endDate) query = query.lte("reservation_date", endDate);
  }
  if (floor) {
    query = query.eq("floor_number", Number(floor));
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: (data as ReservationRow[]).map(mapRow),
  });
}

// POST /api/reservations — create a new reservation
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;

  if (typeof b.customerName !== "string" || !b.customerName.trim()) {
    return NextResponse.json(
      { error: "customerName is required" },
      { status: 400 },
    );
  }
  if (typeof b.floorNumber !== "number" || b.floorNumber < 1) {
    return NextResponse.json(
      { error: "floorNumber must be a positive number" },
      { status: 400 },
    );
  }
  if (typeof b.reservationDate !== "string" || !b.reservationDate) {
    return NextResponse.json(
      { error: "reservationDate is required" },
      { status: 400 },
    );
  }
  if (typeof b.startTime !== "string" || typeof b.endTime !== "string") {
    return NextResponse.json(
      { error: "startTime and endTime are required" },
      { status: 400 },
    );
  }

  const db = createDbClient();

  // Read current minimum spend setting
  const { data: setting } = await db
    .from("app_settings")
    .select("value")
    .eq("key", "reservation_minimum_spend")
    .maybeSingle();

  const minimumSpend =
    (setting?.value as { amount?: number } | null)?.amount ?? 0;

  // Overlap guard (enforced in application layer)
  const { data: existingReservations } = await db
    .from("reservations")
    .select("start_time, end_time, status")
    .eq("floor_number", b.floorNumber)
    .eq("reservation_date", b.reservationDate);

  if (existingReservations && existingReservations.length > 0) {
    const hasOverlap = existingReservations.some((r: any) => {
      if (r.status === "CANCELLED" || r.status === "NO_SHOW") return false;
      return (b.startTime as string) < r.end_time && (b.endTime as string) > r.start_time;
    });
    if (hasOverlap) {
      return NextResponse.json(
        { error: `Sudah ada reservasi di lantai ${b.floorNumber} pada waktu tersebut` },
        { status: 409 },
      );
    }
  }

  const { data, error } = await db
    .from("reservations")
    .insert({
      customer_name: b.customerName,
      customer_phone: typeof b.customerPhone === "string" ? b.customerPhone : null,
      floor_number: b.floorNumber,
      reservation_date: b.reservationDate,
      start_time: b.startTime,
      end_time: b.endTime,
      minimum_spend: minimumSpend,
      notes: typeof b.notes === "string" ? b.notes : null,
    })
    .select()
    .single();

  if (error) {
    // Overlap trigger raises an exception with a message containing 'Sudah ada reservasi'
    const status = error.message?.includes("Sudah ada reservasi") ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ data: mapRow(data as ReservationRow) }, { status: 201 });
}
