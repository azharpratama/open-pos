import { apiFetch } from "@/lib/api";

export type PurchaseItemInput = {
  productId: string;
  qty: number;
  unitCost: number;
};

export type PurchaseItem = {
  name: string;
  qty: number;
  unitCost: number;
  subtotal: number;
};

export type Purchase = {
  id: string;
  purchaseDate: string;
  supplierName: string | null;
  total: number;
  note: string | null;
  kind: string; // "bahan" | "gaji"
  items: PurchaseItem[];
  itemCount: number;
};

export function fetchPurchases(): Promise<Purchase[]> {
  return apiFetch<Purchase[]>("/api/purchases", undefined, "Gagal memuat pembelian");
}

export function recordPurchase(
  supplierId: string | null,
  note: string | null,
  items: PurchaseItemInput[],
): Promise<{ purchaseId: string; total: number }> {
  return apiFetch<{ purchaseId: string; total: number }>(
    "/api/purchases",
    {
      method: "POST",
      body: JSON.stringify({ supplierId, note, items }),
    },
    "Gagal mencatat pembelian"
  );
}
