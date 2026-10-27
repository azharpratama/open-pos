import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";

export const dynamic = "force-dynamic";

type BonusRow = {
  id: string;
  employee_id: string;
  product_id: string;
  allocated: number;
  remaining: number;
  employees: { name: string } | null;
  products: { name: string; unit_type: string } | null;
};

export async function GET() {
  const db = createDbClient();
  const { data, error } = await db
    .from("employee_bonuses")
    .select(
      "id, employee_id, product_id, allocated, remaining, employees(name), products(name, unit_type)",
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data as unknown as BonusRow[];
  return NextResponse.json({
    data: rows.map((b) => ({
      id: b.id,
      employeeId: b.employee_id,
      employeeName: b.employees?.name ?? "?",
      productId: b.product_id,
      productName: b.products?.name ?? "?",
      unitType: b.products?.unit_type ?? "",
      allocated: Number(b.allocated),
      remaining: Number(b.remaining),
    })),
  });
}

// Owner upsert: allocate `allocated` of a product to an employee; remaining is
// reset to the new allocation.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const employeeId = typeof b.employeeId === "string" ? b.employeeId : "";
  const productId = typeof b.productId === "string" ? b.productId : "";
  const allocated =
    typeof b.allocated === "number" && b.allocated >= 0 ? b.allocated : NaN;
  if (!employeeId || !productId) {
    return NextResponse.json(
      { error: "employeeId & productId wajib" },
      { status: 400 },
    );
  }
  if (Number.isNaN(allocated)) {
    return NextResponse.json({ error: "Jatah harus angka >= 0" }, { status: 400 });
  }

  const db = createDbClient();
  const { error } = await db.from("employee_bonuses").upsert(
    {
      employee_id: employeeId,
      product_id: productId,
      allocated,
      remaining: allocated,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "employee_id,product_id" },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: { ok: true } });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const db = createDbClient();
  const { error } = await db.from("employee_bonuses").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: { id } });
}
