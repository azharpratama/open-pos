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

type IngRow = {
  ingredient_product_id: string;
  quantity: number;
  products: { name: string; unit_type: string } | null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = createDbClient();

  const { data: product, error } = await db
    .from("products")
    .select("id, name, category, price, image_url")
    .eq("id", id)
    .eq("category_type", "Menu Jual")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!product) {
    return NextResponse.json({ error: "Menu tidak ditemukan" }, { status: 404 });
  }

  const { data: ings, error: ingErr } = await db
    .from("menu_ingredients")
    .select(
      "ingredient_product_id, quantity, products!menu_ingredients_ingredient_product_id_fkey(name, unit_type)",
    )
    .eq("menu_product_id", id);

  if (ingErr) return NextResponse.json({ error: ingErr.message }, { status: 500 });

  const rows = (ings ?? []) as unknown as IngRow[];
  return NextResponse.json({
    data: {
      id: product.id,
      name: product.name,
      category: product.category ?? "-",
      price: product.price === null ? null : Number(product.price),
      imageUrl: product.image_url,
      ingredients: rows.map((r) => ({
        ingredientId: r.ingredient_product_id,
        ingredientName: r.products?.name ?? "?",
        unitType: r.products?.unit_type ?? "",
        quantity: Number(r.quantity),
      })),
    },
  });
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
  const { name, category, price, imageUrl, ingredients } = parsed.value;

  const db = createDbClient();
  const { data: product, error } = await db
    .from("products")
    .update({
      name,
      category,
      price,
      image_url: imageUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("category_type", "Menu Jual")
    .select("id, name, category, price, image_url")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!product) {
    return NextResponse.json({ error: "Menu tidak ditemukan" }, { status: 404 });
  }

  // Replace the recipe wholesale.
  await db.from("menu_ingredients").delete().eq("menu_product_id", id);
  if (ingredients.length > 0) {
    const { error: ingErr } = await db.from("menu_ingredients").insert(
      ingredients.map((i) => ({
        menu_product_id: id,
        ingredient_product_id: i.ingredientId,
        quantity: i.quantity,
      })),
    );
    if (ingErr) {
      return NextResponse.json({ error: ingErr.message }, { status: 400 });
    }
  }

  return NextResponse.json({
    data: {
      id: product.id,
      name: product.name,
      category: product.category ?? "-",
      price: product.price === null ? null : Number(product.price),
      imageUrl: product.image_url,
      ingredientCount: ingredients.length,
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
    .from("products")
    .update({ is_active: false })
    .eq("id", id)
    .eq("category_type", "Menu Jual");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: { id } });
}
