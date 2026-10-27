import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";

export const dynamic = "force-dynamic";

type ExpenseRow = {
  id: string;
  purchase_date: string;
  total: number;
  note: string | null;
  kind: string;
  suppliers: { name: string } | null;
};

// GET /api/expenses — all purchases where kind is NOT 'bahan' and NOT 'gaji'
// (i.e., operational / other expenses entered manually by the owner)
export async function GET() {
  const db = createDbClient();
  const { data, error } = await db
    .from("purchases")
    .select("id, purchase_date, total, note, kind, suppliers(name)")
    .not("kind", "in", '("bahan","gaji")')
    .order("purchase_date", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data as unknown as ExpenseRow[];
  return NextResponse.json({
    data: rows.map((r) => ({
      id: r.id,
      purchaseDate: r.purchase_date,
      supplierName: r.suppliers?.name ?? null,
      note: r.note,
      total: Number(r.total),
      kind: r.kind,
    })),
  });
}

// POST /api/expenses — record a new operational expense (no stock deduction)
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  const note =
    typeof b.note === "string" && b.note.trim() ? b.note.trim() : null;
  if (!note) {
    return NextResponse.json(
      { error: "Keterangan pengeluaran wajib diisi" },
      { status: 400 },
    );
  }

  const total = Number(b.total);
  if (!Number.isFinite(total) || total <= 0) {
    return NextResponse.json(
      { error: "Jumlah pengeluaran harus lebih dari 0" },
      { status: 400 },
    );
  }

  const supplierId =
    typeof b.supplierId === "string" && b.supplierId.trim()
      ? b.supplierId
      : null;

  // purchaseDate defaults to today (WIB) if not provided
  const now = new Date();
  const defaultDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const purchaseDate =
    typeof b.purchaseDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.purchaseDate)
      ? b.purchaseDate
      : defaultDate;

  const db = createDbClient();
  const { data, error } = await db
    .from("purchases")
    .insert({
      supplier_id: supplierId,
      note,
      total,
      purchase_date: purchaseDate,
      kind: "operasional",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data: { id: data.id } }, { status: 201 });
}
