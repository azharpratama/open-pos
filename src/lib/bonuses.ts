import { apiFetch } from "@/lib/api";

export type Bonus = {
  id: string;
  employeeId: string;
  employeeName: string;
  productId: string;
  productName: string;
  unitType: string;
  allocated: number;
  remaining: number;
};

export function fetchBonuses(): Promise<Bonus[]> {
  return apiFetch<Bonus[]>("/api/bonuses", undefined, "Gagal memuat bonus");
}

export async function setBonus(
  employeeId: string,
  productId: string,
  allocated: number,
): Promise<void> {
  await apiFetch<void>(
    "/api/bonuses",
    {
      method: "POST",
      body: JSON.stringify({ employeeId, productId, allocated }),
    },
    "Gagal menyimpan bonus"
  );
}

export async function removeBonus(id: string): Promise<void> {
  await apiFetch<void>(
    `/api/bonuses?id=${encodeURIComponent(id)}`,
    { method: "DELETE" },
    "Gagal menghapus bonus"
  );
}

export function consumeBonus(
  id: string,
  qty: number,
): Promise<{ remaining: number; stock: number }> {
  return apiFetch<{ remaining: number; stock: number }>(
    "/api/bonuses/consume",
    {
      method: "POST",
      body: JSON.stringify({ id, qty }),
    },
    "Gagal mengambil bonus"
  );
}
