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

function mapRow(e: EmployeeRow) {
  return {
    id: e.id,
    name: e.name,
    bankAccountNo: e.bank_account_no,
    bankName: e.bank_name,
    phone: e.phone,
    shiftCount: Number(e.shift_count),
    dailyWage: Number(e.daily_wage),
  };
}

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

export async function GET() {
  const db = createDbClient();
  const { data, error } = await db
    .from("employees")
    .select("id, name, bank_account_no, bank_name, phone, shift_count, daily_wage")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: (data as EmployeeRow[]).map(mapRow) });
}

export async function POST(request: Request) {
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
    .insert(parsed.value)
    .select("id, name, bank_account_no, bank_name, phone, shift_count, daily_wage")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal menyimpan karyawan" },
      { status: 400 },
    );
  }
  return NextResponse.json({ data: mapRow(data as EmployeeRow) }, { status: 201 });
}
