import { apiFetch } from "@/lib/api";

export type SalaryInfo = {
  date: string;
  total: number;
  employeeCount: number;
  recorded: boolean;
};

export function fetchSalary(date: string): Promise<SalaryInfo> {
  return apiFetch<SalaryInfo>(
    `/api/salary?date=${encodeURIComponent(date)}`,
    undefined,
    "Gagal memuat gaji"
  );
}

export function fetchRecordedSalaryDates(
  from: string,
  to: string,
): Promise<string[]> {
  return apiFetch<string[]>(
    `/api/salary/recorded?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    undefined,
    "Gagal memuat status gaji"
  );
}

export function recordSalary(
  date: string,
): Promise<{ total: number; employeeCount: number }> {
  return apiFetch<{ total: number; employeeCount: number }>(
    "/api/salary",
    {
      method: "POST",
      body: JSON.stringify({ date }),
    },
    "Gagal merekap gaji"
  );
}
