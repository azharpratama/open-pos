import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";

export const dynamic = "force-dynamic";

type SupplierRow = {
  id: string;
  name: string;
  location: string | null;
  contact: string | null;
  notes: string | null;
};

type SupplierPayload = {
  name: string;
  location: string | null;
  contact: string | null;
  notes: string | null;
};

function parseBody(body: unknown): { error: string } | { value: SupplierPayload } {
  if (typeof body !== "object" || body === null) {
    return { error: "Body harus objek JSON" };
  }
  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return { error: "Nama supplier wajib diisi" };
  const str = (v: unknown) =>
    typeof v === "string" && v.trim() !== "" ? v.trim() : null;
  return {
    value: {
      name,
      location: str(b.location),
      contact: str(b.contact),
      notes: str(b.notes),
    },
  };
}

export async function GET() {
  const db = createDbClient();
  const { data, error } = await db
    .from("suppliers")
    .select("id, name, location, contact, notes")
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data as SupplierRow[] });
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
    .from("suppliers")
    .insert({
      name: parsed.value.name,
      location: parsed.value.location,
      contact: parsed.value.contact,
      notes: parsed.value.notes,
    })
    .select("id, name, location, contact, notes")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal menyimpan supplier" },
      { status: 400 },
    );
  }
  return NextResponse.json({ data: data as SupplierRow }, { status: 201 });
}
