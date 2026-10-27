import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";

export const dynamic = "force-dynamic";

// PATCH /api/cancellations/[id] — approve or reject a cancellation request
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

  const { action } = (body ?? {}) as { action?: string };
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json(
      { error: 'action must be "approve" or "reject"' },
      { status: 400 },
    );
  }

  const db = createDbClient();

  // Fetch the request
  const { data: req, error: fetchErr } = await db
    .from("cancellation_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !req) {
    return NextResponse.json(
      { error: "Permintaan pembatalan tidak ditemukan" },
      { status: 404 },
    );
  }

  if (req.status !== "PENDING") {
    return NextResponse.json(
      { error: "Permintaan ini sudah diproses" },
      { status: 400 },
    );
  }

  if (action === "reject") {
    const { error } = await db
      .from("cancellation_requests")
      .update({
        status: "REJECTED",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  // Parse requested item_ids
  let itemIds: string[] = [];
  if (req.item_ids && Array.isArray(req.item_ids)) {
    itemIds = req.item_ids;
  }

  const { data: orderData } = await db
    .from("orders")
    .select("reservation_id")
    .eq("id", req.order_id)
    .single();

  if (itemIds.length > 0) {
    // Item-level cancellation
    const { error } = await db.rpc("cancel_order_items", {
      p_order_id: req.order_id,
      p_item_ids: itemIds,
      p_cancellation_id: id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    // Whole order cancellation
    const { error } = await db.rpc("cancel_order_transaction", {
      p_order_id: req.order_id,
      p_cancellation_id: id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (orderData?.reservation_id) {
      await db
        .from("reservations")
        .update({ status: "CANCELLED" })
        .eq("id", orderData.reservation_id);
    }
  }

  return NextResponse.json({ success: true });
}
