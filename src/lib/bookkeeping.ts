import {
  addDays,
  startOfMonthWIB,
  startOfWeekWIB,
  todayWIB,
} from "@/lib/format";

// Income statement (Laporan Laba Rugi) figures for a period, straight from the
// bookkeeping_report RPC. All amounts are in Rupiah.
export type IncomeStatement = {
  revenueGross: number; // penjualan kotor (sebelum diskon)
  discountTotal: number; // total diskon penjualan
  revenueNet: number; // pendapatan bersih
  revenueTunai: number;
  revenueQris: number;
  revenueTransfer: number;
  txCount: number; // jumlah transaksi
  cogs: number; // HPP — pembelian bahan baku
  salary: number; // beban gaji
  otherExpense: number; // beban lain-lain
};

// One cash-book (Buku Kas) entry. Exactly one of cashIn / cashOut is non-zero.
// `balance` is the running saldo through this entry (computed server-side).
export type CashBookEntry = {
  date: string; // YYYY-MM-DD (WIB)
  ref: string | null;
  description: string;
  category: string;
  cashIn: number;
  cashOut: number;
  balance: number;
};

export type BookkeepingData = {
  start: string;
  end: string;
  summary: IncomeStatement;
  ledger: CashBookEntry[];
};

export type PeriodPreset = "today" | "week" | "month" | "custom";

// Resolves a preset into the [start, end] WIB date range the API expects. These
// mirror the dashboard's "Hari Ini / Minggu Ini / Bulan Ini" so the figures line
// up with the dashboard's Ringkasan Periode.
export function presetRange(preset: Exclude<PeriodPreset, "custom">): {
  start: string;
  end: string;
} {
  const end = todayWIB();
  switch (preset) {
    case "today":
      return { start: end, end };
    case "week":
      return { start: startOfWeekWIB(), end };
    case "month":
      return { start: startOfMonthWIB(), end };
  }
}

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  today: "Hari Ini",
  week: "Minggu Ini",
  month: "Bulan Ini",
  custom: "Kustom",
};

// Derived income-statement lines. Kept here so the page and any future export
// (PDF/CSV) compute the same totals the same way.
export function grossProfit(s: IncomeStatement): number {
  return s.revenueNet - s.cogs;
}
export function operatingExpense(s: IncomeStatement): number {
  return s.salary + s.otherExpense;
}
export function netProfit(s: IncomeStatement): number {
  return grossProfit(s) - operatingExpense(s);
}
export function totalExpense(s: IncomeStatement): number {
  return s.cogs + s.salary + s.otherExpense;
}
// Net profit margin as a fraction of net revenue (0 when there is no revenue).
export function netMargin(s: IncomeStatement): number {
  return s.revenueNet > 0 ? netProfit(s) / s.revenueNet : 0;
}

export async function fetchBookkeeping(
  start: string,
  end: string,
): Promise<BookkeepingData> {
  const res = await fetch(
    `/api/bookkeeping?start=${start}&end=${end}`,
    { cache: "no-store" },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Gagal memuat pembukuan");
  return json.data as BookkeepingData;
}

// Re-exported so callers can build custom ranges without a second import.
export { addDays, todayWIB };
