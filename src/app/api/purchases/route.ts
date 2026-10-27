import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";

export const dynamic = "force-dynamic";

type PurchaseItemRow = {
  product_name: string | null;
  quantity: number;
  unit_cost: number;
  subtotal: number;
};

type PurchaseRow = {
  id: string;
  purchase_date: string;
  total: number;
  note: string | null;
  kind: string;
  suppliers: { name: string } | null;
  purchase_items: PurchaseItemRow[];
};

// GET /api/purchases — recent purchases with supplier name + the items bought
// (name, qty, unit cost) so the list can show WHAT was purchased, not just a
// count.
export async function GET() {
  const db = createDbClient();
  const { data, error } = await db
    .from("purchases")
    .select(
      "id, purchase_date, total, note, kind, suppliers(name), purchase_items(product_name, quantity, unit_cost, subtotal)",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data as unknown as PurchaseRow[];
  return NextResponse.json({
    data: rows.map((p) => {
      const items = (p.purchase_items ?? []).map((it) => ({
        name: it.product_name ?? "Bahan",
        qty: Number(it.quantity),
        unitCost: Number(it.unit_cost),
        subtotal: Number(it.subtotal),
      }));
      return {
        id: p.id,
        purchaseDate: p.purchase_date,
        supplierName: p.suppliers?.name ?? null,
        total: Number(p.total),
        note: p.note,
        kind: p.kind,
        items,
        itemCount: items.length,
      };
    }),
  });
}

type ItemInput = { productId: string; qty: number; unitCost: number };

// POST /api/purchases — records a purchase (adds stock) via record_purchase.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const supplierId =
    typeof b.supplierId === "string" && b.supplierId.trim() ? b.supplierId : null;
  const note = typeof b.note === "string" && b.note.trim() ? b.note.trim() : null;

  // Supplier is mandatory for a bahan purchase: every stock buy must be
  // attributable to a supplier.
  if (!supplierId) {
    return NextResponse.json(
      { error: "Supplier wajib dipilih" },
      { status: 400 },
    );
  }

  if (!Array.isArray(b.items) || b.items.length === 0) {
    return NextResponse.json(
      { error: "Pembelian harus punya minimal satu item" },
      { status: 400 },
    );
  }
  const items: ItemInput[] = [];
  for (const raw of b.items) {
    const it = raw as Record<string, unknown>;
    if (
      typeof it.productId !== "string" ||
      typeof it.qty !== "number" ||
      it.qty <= 0 ||
      typeof it.unitCost !== "number" ||
      it.unitCost < 0
    ) {
      return NextResponse.json(
        { error: "Setiap item butuh produk, qty > 0, dan harga >= 0" },
        { status: 400 },
      );
    }
    items.push({ productId: it.productId, qty: it.qty, unitCost: it.unitCost });
  }

  const db = createDbClient();
  const { data, error } = await db.rpc("record_purchase", {
    p_supplier_id: supplierId,
    p_note: note,
    p_items: items,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  const result = data?.[0];
  return NextResponse.json(
    { data: { purchaseId: result?.purchase_id, total: Number(result?.total ?? 0) } },
    { status: 201 },
  );
}
