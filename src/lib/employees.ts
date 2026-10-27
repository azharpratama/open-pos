import { apiFetch } from "@/lib/api";

export type Employee = {
  id: string;
  name: string;
  bankAccountNo: string | null;
  bankName: string | null;
  phone: string | null;
  shiftCount: number;
  dailyWage: number;
};

export type EmployeeInput = {
  name: string;
  bankAccountNo: string | null;
  bankName: string | null;
  phone: string | null;
  shiftCount: number;
  dailyWage: number;
};

export function fetchEmployees(): Promise<Employee[]> {
  return apiFetch<Employee[]>("/api/employees", undefined, "Gagal memuat karyawan");
}

export function createEmployee(input: EmployeeInput): Promise<Employee> {
  return apiFetch<Employee>(
    "/api/employees",
    { method: "POST", body: JSON.stringify(input) },
    "Gagal menyimpan karyawan"
  );
}

export function updateEmployee(
  id: string,
  input: EmployeeInput,
): Promise<Employee> {
  return apiFetch<Employee>(
    `/api/employees/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(input) },
    "Gagal memperbarui karyawan"
  );
}

export async function deleteEmployee(id: string): Promise<void> {
  await apiFetch<void>(
    `/api/employees/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    "Gagal menghapus karyawan"
  );
}
