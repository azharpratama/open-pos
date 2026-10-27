import { apiFetch } from "@/lib/api";

export type InventoryItem = {
  id: string;
  name: string;
  unitType: string;
  stockQty: number;
  price: number | null;
};

export type InventoryInput = {
  name: string;
  unitType: string;
  stockQty: number;
  price: number | null;
};

export const SATUAN_UNITS = ["pcs"];
export const TERUKUR_UNITS = ["kg", "liter", "kwh", "kantong"];

export type UnitKind = "Satuan" | "Terukur";

export function unitKind(unit: string): UnitKind {
  return TERUKUR_UNITS.includes(unit.trim().toLowerCase()) ? "Terukur" : "Satuan";
}

export function fetchInventory(): Promise<InventoryItem[]> {
  return apiFetch<InventoryItem[]>("/api/inventory", undefined, "Gagal memuat inventory");
}

export function createInventory(input: InventoryInput): Promise<InventoryItem> {
  return apiFetch<InventoryItem>(
    "/api/inventory",
    { method: "POST", body: JSON.stringify(input) },
    "Gagal menyimpan bahan"
  );
}

export function updateInventory(
  id: string,
  input: InventoryInput,
): Promise<InventoryItem> {
  return apiFetch<InventoryItem>(
    `/api/inventory/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(input) },
    "Gagal memperbarui bahan"
  );
}

export async function deleteInventory(id: string): Promise<void> {
  await apiFetch<void>(
    `/api/inventory/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    "Gagal menghapus bahan"
  );
}
