import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";

export const dynamic = "force-dynamic";

// PATCH /api/orders/:ref — updates a single order's status (ANTRIAN <-> SELESAI).
// The order is addressed by its human order_ref (e.g. POS123456), which is unique.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ ref: string }> },
) {
  const { ref } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const orderStatus = (body as Record<string, unknown>)?.orderStatus;
  if (orderStatus !== "ANTRIAN" && orderStatus !== "SELESAI") {
    return NextResponse.json(
      { error: "orderStatus must be ANTRIAN or SELESAI" },
      { status: 400 },
    );
  }

  const db = createDbClient();
  const { data, error } = await db
    .from("orders")
    .update({ order_status: orderStatus })
    .eq("order_ref", ref)
    .select("order_ref, order_status, reservation_id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (data.reservation_id) {
    if (orderStatus === "SELESAI") {
      await db.from("reservations").update({ status: "COMPLETED" }).eq("id", data.reservation_id);
    } else if (orderStatus === "ANTRIAN") {
      await db.from("reservations").update({ status: "CHECKED_IN" }).eq("id", data.reservation_id);
    }
  }

  return NextResponse.json({
    data: { orderRef: data.order_ref, orderStatus: data.order_status },
  });
}
