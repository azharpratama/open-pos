import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";

export const dynamic = "force-dynamic";

type EmployeeRow = {
  id: string;
  name: string;
  bank_account_no: string | null;
  bank_name: string | null;
  phone: string | null;
  shift_count: number;
  daily_wage: number;
};

type EmployeePayload = {
  name: string;
  bank_account_no: string | null;
  bank_name: string | null;
  phone: string | null;
  shift_count: number;
  daily_wage: number;
};

function parseBody(body: unknown): { error: string } | { value: EmployeePayload } {
  if (typeof body !== "object" || body === null) {
    return { error: "Body harus objek JSON" };
  }
  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return { error: "Nama karyawan wajib diisi" };
  const str = (v: unknown) =>
    typeof v === "string" && v.trim() !== "" ? v.trim() : null;
  const shiftCount =
    typeof b.shiftCount === "number" && b.shiftCount >= 0
      ? Math.floor(b.shiftCount)
      : 0;
  const dailyWage =
    typeof b.dailyWage === "number" && b.dailyWage >= 0 ? b.dailyWage : 0;
  return {
    value: {
      name,
      bank_account_no: str(b.bankAccountNo),
      bank_name: str(b.bankName),
      phone: str(b.phone),
      shift_count: shiftCount,
      daily_wage: dailyWage,
    },
  };
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
  const parsed = parseBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const db = createDbClient();
  const { data, error } = await db
    .from("employees")
    .update({ ...parsed.value, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, name, bank_account_no, bank_name, phone, shift_count, daily_wage")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) {
    return NextResponse.json({ error: "Karyawan tidak ditemukan" }, { status: 404 });
  }

  const e = data as EmployeeRow;
  return NextResponse.json({
    data: {
      id: e.id,
      name: e.name,
      bankAccountNo: e.bank_account_no,
      bankName: e.bank_name,
      phone: e.phone,
      shiftCount: Number(e.shift_count),
      dailyWage: Number(e.daily_wage),
    },
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = createDbClient();
  const { error } = await db
    .from("employees")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: { id } });
}
