import { apiFetch } from "@/lib/api";

export type ExpenseInput = {
  supplierId?: string | null;
  note: string;
  total: number;
  purchaseDate?: string; // YYYY-MM-DD, defaults to today on the server
};

export type Expense = {
  id: string;
  purchaseDate: string;
  supplierName: string | null;
  note: string | null;
  total: number;
  kind: string;
};

export function fetchExpenses(): Promise<Expense[]> {
  return apiFetch<Expense[]>("/api/expenses", undefined, "Gagal memuat pengeluaran");
}

export function recordExpense(
  input: ExpenseInput,
): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(
    "/api/expenses",
    { method: "POST", body: JSON.stringify(input) },
    "Gagal mencatat pengeluaran"
  );
}
