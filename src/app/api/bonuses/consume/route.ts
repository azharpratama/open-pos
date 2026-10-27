import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";

export const dynamic = "force-dynamic";

// POST /api/bonuses/consume { id, qty } — cashier draws down a bonus quota,
// which also decrements warehouse stock (atomic, via consume_bonus).
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const id = typeof b.id === "string" ? b.id : "";
  const qty = typeof b.qty === "number" && b.qty > 0 ? b.qty : NaN;
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });
  if (Number.isNaN(qty)) {
    return NextResponse.json({ error: "qty harus > 0" }, { status: 400 });
  }

  const db = createDbClient();
  const { data, error } = await db.rpc("consume_bonus", {
    p_bonus_id: id,
    p_qty: qty,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const row = data?.[0];
  return NextResponse.json({
    data: {
      remaining: Number(row?.remaining ?? 0),
      stock: Number(row?.stock ?? 0),
    },
  });
}
