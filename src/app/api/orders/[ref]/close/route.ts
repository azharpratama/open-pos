import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";

export const dynamic = "force-dynamic";

// POST /api/orders/[ref]/close — close an open bill by taking payment
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

  const b = (body ?? {}) as Record<string, unknown>;

  if (
    b.paymentMethod !== "TUNAI" &&
    b.paymentMethod !== "QRIS" &&
    b.paymentMethod !== "TRANSFER"
  ) {
    return NextResponse.json(
      { error: "paymentMethod must be TUNAI, QRIS, or TRANSFER" },
      { status: 400 },
    );
  }

  if (typeof b.amountPaid !== "number" || b.amountPaid < 0) {
    return NextResponse.json(
      { error: "amountPaid must be a non-negative number" },
      { status: 400 },
    );
  }

  const db = createDbClient();

  const { data: order, error: fetchErr } = await db
    .from("orders")
    .select("id, is_open_bill, payment_status, subtotal, discount, total_amount, reservation_id")
    .eq("order_ref", ref)
    .maybeSingle();

  if (fetchErr || !order) {
    return NextResponse.json(
      { error: "Pesanan tidak ditemukan" },
      { status: 404 },
    );
  }

  if (!order.is_open_bill && !order.reservation_id) {
    return NextResponse.json(
      { error: "Pesanan ini bukan open bill atau reservasi" },
      { status: 400 },
    );
  }

  if (order.payment_status === "SUCCESS") {
    return NextResponse.json(
      { error: "Pesanan sudah lunas" },
      { status: 400 },
    );
  }

  const finalDiscount = typeof b.discount === "number" && b.discount >= 0 ? b.discount : order.discount;
  const finalTotalAmount = Math.max(0, order.subtotal - finalDiscount);

  const { error } = await db
    .from("orders")
    .update({
      payment_method: b.paymentMethod,
      payment_status: "SUCCESS",
      order_status: "SELESAI",
      amount_paid: b.amountPaid,
      change_amount: typeof b.changeAmount === "number" ? b.changeAmount : 0,
      is_open_bill: false,
      discount: finalDiscount,
      total_amount: finalTotalAmount,
    })
    .eq("id", order.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
