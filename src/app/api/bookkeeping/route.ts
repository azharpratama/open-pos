import { NextResponse } from "next/server";

import { createDbClient } from "@/lib/db-client";

export const dynamic = "force-dynamic";

type ReportRow = {
  revenue_gross: number;
  discount_total: number;
  revenue_net: number;
  revenue_tunai: number;
  revenue_qris: number;
  revenue_transfer: number;
  tx_count: number;
  cogs: number;
  salary: number;
  other_expense: number;
};

type LedgerRow = {
  entry_date: string;
  ref: string | null;
  description: string;
  category: string;
  cash_in: number;
  cash_out: number;
  balance: number;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/bookkeeping?start=YYYY-MM-DD&end=YYYY-MM-DD — the income statement
// (Laporan Laba Rugi) aggregates and the cash book (Buku Kas) for a WIB date
// range. Defaults to the current month when params are missing/invalid.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const now = new Date();
  // WIB "today" as a fallback, computed without extra deps.
  const wibToday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const rawStart = params.get("start");
  const rawEnd = params.get("end");
  let start = rawStart && DATE_RE.test(rawStart) ? rawStart : `${wibToday.slice(0, 7)}-01`;
  let end = rawEnd && DATE_RE.test(rawEnd) ? rawEnd : wibToday;
  // Keep the range ordered even if the client sends it backwards.
  if (start > end) [start, end] = [end, start];

  const db = createDbClient();
  const [reportRes, ledgerRes] = await Promise.all([
    db.rpc("bookkeeping_report", { p_start: start, p_end: end }),
    db.rpc("cash_book", { p_start: start, p_end: end }),
  ]);

  if (reportRes.error) {
    return NextResponse.json({ error: reportRes.error.message }, { status: 500 });
  }
  if (ledgerRes.error) {
    return NextResponse.json({ error: ledgerRes.error.message }, { status: 500 });
  }

  const r = (reportRes.data?.[0] ?? {}) as Partial<ReportRow>;
  const summary = {
    revenueGross: Number(r.revenue_gross ?? 0),
    discountTotal: Number(r.discount_total ?? 0),
    revenueNet: Number(r.revenue_net ?? 0),
    revenueTunai: Number(r.revenue_tunai ?? 0),
    revenueQris: Number(r.revenue_qris ?? 0),
    revenueTransfer: Number(r.revenue_transfer ?? 0),
    txCount: Number(r.tx_count ?? 0),
    cogs: Number(r.cogs ?? 0),
    salary: Number(r.salary ?? 0),
    otherExpense: Number(r.other_expense ?? 0),
  };

  const ledger = ((ledgerRes.data as LedgerRow[]) ?? []).map((e) => ({
    date: e.entry_date,
    ref: e.ref,
    description: e.description,
    category: e.category,
    cashIn: Number(e.cash_in),
    cashOut: Number(e.cash_out),
    balance: Number(e.balance),
  }));

  return NextResponse.json({ data: { start, end, summary, ledger } });
}
