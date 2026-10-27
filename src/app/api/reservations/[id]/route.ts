import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";

export const dynamic = "force-dynamic";

// GET /api/reservations/[id] — single reservation detail
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = createDbClient();

  const { data, error } = await db
    .from("reservations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Reservasi tidak ditemukan" },
      { status: 404 },
    );
  }

  const r = data as Record<string, unknown>;
  return NextResponse.json({
    data: {
      id: r.id,
      customerName: r.customer_name,
      customerPhone: r.customer_phone ?? undefined,
      floorNumber: r.floor_number,
      reservationDate: r.reservation_date,
      startTime: (r.start_time as string)?.slice(0, 5),
      endTime: (r.end_time as string)?.slice(0, 5),
      minimumSpend: Number(r.minimum_spend),
      depositAmount: Number(r.deposit_amount),
      depositMethod: r.deposit_method ?? undefined,
      status: r.status,
      notes: r.notes ?? undefined,
      orderId: r.order_id ?? undefined,
      createdAt: r.created_at,
    },
  });
}

// PATCH /api/reservations/[id] — update status, link order, record deposit
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  if (typeof b.status === "string") {
    const valid = ["CONFIRMED", "CHECKED_IN", "COMPLETED", "CANCELLED", "NO_SHOW"];
    if (!valid.includes(b.status)) {
      return NextResponse.json(
        { error: `status must be one of: ${valid.join(", ")}` },
        { status: 400 },
      );
    }
    updates.status = b.status;
  }
  if (typeof b.orderId === "string") {
    updates.order_id = b.orderId;
  }
  if (typeof b.depositAmount === "number") {
    updates.deposit_amount = b.depositAmount;
  }
  if (typeof b.depositMethod === "string") {
    updates.deposit_method = b.depositMethod;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 },
    );
  }

  const db = createDbClient();
  const { error } = await db
    .from("reservations")
    .update(updates)
    .eq("id", id);

  if (error) {
    const status = error.message?.includes("Sudah ada reservasi") ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/reservations/[id] — completely remove a reservation
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = createDbClient();

  const { error } = await db
    .from("reservations")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
