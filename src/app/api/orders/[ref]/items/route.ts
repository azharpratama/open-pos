import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";

export const dynamic = "force-dynamic";

// POST /api/orders/[ref]/items — add items to an open bill
export async function POST(
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

  const { items } = (body ?? {}) as {
    items?: { productId: string; qty: number; modifier?: string }[];
  };

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "items must be a non-empty array" },
      { status: 400 },
    );
  }

  for (const item of items) {
    if (typeof item.productId !== "string" || typeof item.qty !== "number" || item.qty <= 0) {
      return NextResponse.json(
        { error: "Each item needs a productId and a positive qty" },
        { status: 400 },
      );
    }
  }

  const db = createDbClient();

  // Resolve order_ref to order id
  const { data: order, error: orderErr } = await db
    .from("orders")
    .select("id, is_open_bill, reservation_id")
    .eq("order_ref", ref)
    .maybeSingle();

  if (orderErr || !order) {
    return NextResponse.json(
      { error: "Pesanan tidak ditemukan" },
      { status: 404 },
    );
  }

  if (!order.is_open_bill && !order.reservation_id) {
    return NextResponse.json(
      { error: "Hanya Open Bill atau Reservasi yang dapat ditambah item" },
      { status: 400 },
    );
  }

  const { data, error } = await db.rpc("add_items_to_order", {
    p_order_id: order.id,
    p_items: items,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const result = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({
    data: {
      newSubtotal: Number(result?.new_subtotal ?? 0),
      newTotal: Number(result?.new_total ?? 0),
    },
  });
}
