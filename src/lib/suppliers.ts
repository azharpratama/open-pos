import { apiFetch } from "@/lib/api";

export type Supplier = {
  id: string;
  name: string;
  location: string | null;
  contact: string | null;
  notes: string | null;
};

export type SupplierInput = {
  name: string;
  location: string | null;
  contact: string | null;
  notes: string | null;
};

export function fetchSuppliers(): Promise<Supplier[]> {
  return apiFetch<Supplier[]>("/api/suppliers", undefined, "Gagal memuat supplier");
}

export function createSupplier(input: SupplierInput): Promise<Supplier> {
  return apiFetch<Supplier>(
    "/api/suppliers",
    { method: "POST", body: JSON.stringify(input) },
    "Gagal menyimpan supplier"
  );
}

export function updateSupplier(id: string, input: SupplierInput): Promise<Supplier> {
  return apiFetch<Supplier>(
    `/api/suppliers/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(input) },
    "Gagal memperbarui supplier"
  );
}

export async function deleteSupplier(id: string): Promise<void> {
  await apiFetch<void>(
    `/api/suppliers/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    "Gagal menghapus supplier"
  );
}
