import { apiFetch } from "@/lib/api";

export type ProductCategory = "Kopi" | "Non-Kopi" | "Makanan" | "Snack";

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "Kopi",
  "Non-Kopi",
  "Makanan",
  "Snack",
];

export type RecipeLine = {
  ingredientId: string;
  perUnit: number;
  stock: number;
};

export type MenuProduct = {
  id: string;
  name: string;
  price: number;
  category: ProductCategory;
  stockQty: number;
  unitType: string;
  imageUrl: string | null;
  available: boolean;
  recipe: RecipeLine[];
};

type MenuApiItem = {
  id: string;
  name: string;
  price: number | null;
  category: string | null;
  stockQty: number | null;
  unitType: string | null;
  imageUrl?: string | null;
  available?: boolean;
  recipe?: RecipeLine[];
};

function normalizeCategory(value: string | null): ProductCategory {
  return PRODUCT_CATEGORIES.includes(value as ProductCategory)
    ? (value as ProductCategory)
    : "Snack";
}

export async function fetchMenu(): Promise<MenuProduct[]> {
  const data = await apiFetch<MenuApiItem[]>("/api/menu", undefined, "Gagal memuat menu");
  return data.map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price ?? 0,
    category: normalizeCategory(item.category),
    stockQty: item.stockQty ?? 0,
    unitType: item.unitType ?? "pcs",
    imageUrl: item.imageUrl ?? null,
    available: item.available ?? true,
    recipe: item.recipe ?? [],
  }));
}
