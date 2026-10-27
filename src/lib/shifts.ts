import { apiFetch } from "@/lib/api";

export type ShiftDaySummary = {
  operationalDate: string; // YYYY-MM-DD (WIB)
  siang: number;
  malam: number;
  luar: number; // revenue outside operating hours (02:00–09:00)
  total: number;
  siangRunning: boolean; // a shift in this window is still open
  malamRunning: boolean;
  siangNames: string[]; // cashiers rostered for the siang window
  malamNames: string[]; // cashiers rostered for the malam window
};

export function openShiftRecord(): Promise<{ id: string; openedAt: string }> {
  return apiFetch<{ id: string; openedAt: string }>(
    "/api/shifts",
    { method: "POST" },
    "Gagal membuka shift"
  );
}

export async function closeShiftRecord(): Promise<number> {
  const data = await apiFetch<{ revenue?: number }>(
    "/api/shifts",
    { method: "PATCH" },
    "Gagal menutup shift"
  );
  return Number(data?.revenue ?? 0);
}

export type TodayRevenue = {
  operationalDate: string; // YYYY-MM-DD (WIB)
  total: number;
  siang: number;
  malam: number;
  luar: number;
};

export function fetchTodayRevenue(): Promise<TodayRevenue> {
  return apiFetch<TodayRevenue>(
    "/api/shifts/revenue",
    undefined,
    "Gagal memuat pendapatan hari ini"
  );
}

export const TODAY_REVENUE_KEY = "/api/shifts/revenue";

export function fetchShiftRecap(): Promise<ShiftDaySummary[]> {
  return apiFetch<ShiftDaySummary[]>(
    "/api/shifts/recap",
    undefined,
    "Gagal memuat riwayat shift"
  );
}
