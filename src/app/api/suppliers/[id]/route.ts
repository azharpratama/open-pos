import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";

export const dynamic = "force-dynamic";

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
    .from("suppliers")
    .update({
      name: parsed.value.name,
      location: parsed.value.location,
      contact: parsed.value.contact,
      notes: parsed.value.notes,
    })
    .eq("id", id)
    .select("id, name, location, contact, notes")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) {
    return NextResponse.json({ error: "Supplier tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = createDbClient();
  const { error } = await db.from("suppliers").delete().eq("id", id);

  if (error) {
    // 23503 = foreign_key_violation — supplier is still referenced by products.
    if (error.code === "23503") {
      return NextResponse.json(
        { error: "Supplier masih terpakai (ada produk/pembelian terkait)" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data: { id } });
}
