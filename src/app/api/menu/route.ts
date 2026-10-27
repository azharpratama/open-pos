import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";

// Always hits the DB — menu prices/stock/availability can change at any time.
export const dynamic = "force-dynamic";

type MenuRow = {
  id: string;
  name: string;
  price: number | null;
  category: string | null;
  unit_type: string | null;
  stock_qty: number | null;
  image_url: string | null;
  recipe: {
    quantity: number;
    ingredient: { id: string; stock_qty: number | null } | null;
  }[];
};

export async function GET() {
  const db = createDbClient();

  const { data, error } = await db
    .from("products")
    .select(
      "id, name, price, category, unit_type, stock_qty, image_url, recipe:menu_ingredients!menu_ingredients_menu_product_id_fkey(quantity, ingredient:products!menu_ingredients_ingredient_product_id_fkey(id, stock_qty))",
    )
    .eq("category_type", "Menu Jual")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const menu = (data as unknown as MenuRow[]).map((product) => {
    const recipe = (product.recipe ?? [])
      .filter((r) => r.ingredient?.id)
      .map((r) => ({
        ingredientId: r.ingredient!.id,
        perUnit: Number(r.quantity),
        stock: Number(r.ingredient!.stock_qty ?? 0),
      }));

    // Orderable for at least one serving iff every ingredient has enough stock.
    const available =
      recipe.length === 0
        ? true
        : recipe.every((r) => r.stock >= r.perUnit);

    return {
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      stockQty: product.stock_qty,
      unitType: product.unit_type,
      imageUrl: product.image_url,
      available,
      recipe,
    };
  });

  return NextResponse.json({ data: menu });
}
