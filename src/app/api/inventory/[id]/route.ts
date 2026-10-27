import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";

export const dynamic = "force-dynamic";

type ProductRow = {
  id: string;
  name: string;
  unit_type: string;
  stock_qty: number;
  price: number | null;
};

type InventoryPayload = {
  name: string;
  unit_type: string;
  stock_qty: number;
  price: number | null;
};

function parseInventoryBody(
  body: unknown,
): { error: string } | { value: InventoryPayload } {
  if (typeof body !== "object" || body === null) {
    return { error: "Body harus objek JSON" };
  }
  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return { error: "Nama bahan wajib diisi" };
  const unitType = typeof b.unitType === "string" ? b.unitType.trim() : "";
  if (!unitType) return { error: "Satuan wajib diisi" };
  if (typeof b.stockQty !== "number" || b.stockQty < 0) {
    return { error: "Stok harus angka >= 0" };
  }
  const price =
    b.price === null || b.price === undefined
      ? null
      : typeof b.price === "number" && b.price >= 0
        ? b.price
        : NaN;
  if (Number.isNaN(price)) return { error: "Harga harus angka >= 0" };

  return { value: { name, unit_type: unitType, stock_qty: b.stockQty, price } };
}

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

  const parsed = parseInventoryBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const db = createDbClient();
  const { data, error } = await db
    .from("products")
    .update({ ...parsed.value, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("category_type", "Bahan Baku")
    .select("id, name, unit_type, stock_qty, price")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) {
    return NextResponse.json({ error: "Bahan tidak ditemukan" }, { status: 404 });
  }

  const p = data as ProductRow;
  return NextResponse.json({
    data: {
      id: p.id,
      name: p.name,
      unitType: p.unit_type,
      stockQty: Number(p.stock_qty),
      price: p.price === null ? null : Number(p.price),
    },
  });
}

// Soft delete: keep the row (it may be referenced by recipes / logs) but hide it.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = createDbClient();
  const { error } = await db
    .from("products")
    .update({ is_active: false })
    .eq("id", id)
    .eq("category_type", "Bahan Baku");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: { id } });
}
