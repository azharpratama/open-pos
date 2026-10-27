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

function mapRow(p: ProductRow) {
  return {
    id: p.id,
    name: p.name,
    unitType: p.unit_type,
    stockQty: Number(p.stock_qty),
    price: p.price === null ? null : Number(p.price),
  };
}

type InventoryPayload = {
  name: string;
  unit_type: string;
  stock_qty: number;
  price: number | null;
};

// Validation for the POST body (PATCH has its own copy in [id]/route.ts).
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

export async function GET() {
  const db = createDbClient();
  const { data, error } = await db
    .from("products")
    .select("id, name, unit_type, stock_qty, price")
    .eq("category_type", "Bahan Baku")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: (data as ProductRow[]).map(mapRow) });
}

export async function POST(request: Request) {
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
    .insert({ ...parsed.value, category_type: "Bahan Baku", is_active: true })
    .select("id, name, unit_type, stock_qty, price")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal menyimpan bahan" },
      { status: 400 },
    );
  }
  return NextResponse.json({ data: mapRow(data as ProductRow) }, { status: 201 });
}
