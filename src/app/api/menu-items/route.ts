import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";

export const dynamic = "force-dynamic";

const CATEGORIES = ["Kopi", "Non-Kopi", "Makanan", "Snack"];

type MenuPayload = {
  name: string;
  category: string;
  price: number | null;
  imageUrl: string | null;
  ingredients: { ingredientId: string; quantity: number }[];
};

function parseBody(body: unknown): { error: string } | { value: MenuPayload } {
  if (typeof body !== "object" || body === null) {
    return { error: "Body harus objek JSON" };
  }
  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return { error: "Nama menu wajib diisi" };
  const category = typeof b.category === "string" ? b.category : "";
  if (!CATEGORIES.includes(category)) return { error: "Kategori tidak valid" };
  const price =
    b.price === null || b.price === undefined
      ? null
      : typeof b.price === "number" && b.price >= 0
        ? b.price
        : NaN;
  if (Number.isNaN(price)) return { error: "Harga harus angka >= 0" };
  const imageUrl =
    typeof b.imageUrl === "string" && b.imageUrl.trim() ? b.imageUrl.trim() : null;

  const ingredients: { ingredientId: string; quantity: number }[] = [];
  if (Array.isArray(b.ingredients)) {
    for (const raw of b.ingredients) {
      const it = raw as Record<string, unknown>;
      if (
        typeof it.ingredientId === "string" &&
        typeof it.quantity === "number" &&
        it.quantity > 0
      ) {
        ingredients.push({ ingredientId: it.ingredientId, quantity: it.quantity });
      }
    }
  }
  return { value: { name, category, price, imageUrl, ingredients } };
}

type ListRow = {
  id: string;
  name: string;
  category: string | null;
  price: number | null;
  image_url: string | null;
  menu_ingredients: { id: string }[];
};

export async function GET() {
  const db = createDbClient();
  const { data, error } = await db
    .from("products")
    .select(
      "id, name, category, price, image_url, menu_ingredients!menu_ingredients_menu_product_id_fkey(id)",
    )
    .eq("category_type", "Menu Jual")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data as unknown as ListRow[];
  return NextResponse.json({
    data: rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category ?? "-",
      price: r.price === null ? null : Number(r.price),
      imageUrl: r.image_url,
      ingredientCount: r.menu_ingredients?.length ?? 0,
    })),
  });
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
  const { name, category, price, imageUrl, ingredients } = parsed.value;

  const db = createDbClient();
  const { data: product, error } = await db
    .from("products")
    .insert({
      name,
      category,
      price,
      image_url: imageUrl,
      category_type: "Menu Jual",
      // unit_type is NOT NULL; menu-jual products are all sold per-piece.
      unit_type: "pcs",
      is_active: true,
      stock_qty: 0,
    })
    .select("id, name, category, price, image_url")
    .maybeSingle();

  if (error || !product) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal menyimpan menu" },
      { status: 400 },
    );
  }

  if (ingredients.length > 0) {
    const { error: ingErr } = await db.from("menu_ingredients").insert(
      ingredients.map((i) => ({
        menu_product_id: product.id,
        ingredient_product_id: i.ingredientId,
        quantity: i.quantity,
      })),
    );
    if (ingErr) {
      return NextResponse.json({ error: ingErr.message }, { status: 400 });
    }
  }

  return NextResponse.json(
    {
      data: {
        id: product.id,
        name: product.name,
        category: product.category ?? "-",
        price: product.price === null ? null : Number(product.price),
        imageUrl: product.image_url,
        ingredientCount: ingredients.length,
      },
    },
    { status: 201 },
  );
}
