"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BookText,
  Download,
  Loader2,
  Percent,
  Scale,
  Wallet,
} from "lucide-react";
import useSWR from "swr";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDateLong, formatDateShort, formatRupiah } from "@/lib/format";
import {
  fetchBookkeeping,
  grossProfit,
  netMargin,
  netProfit,
  operatingExpense,
  presetRange,
  totalExpense,
  type BookkeepingData,
  type CashBookEntry,
  type IncomeStatement,
  type PeriodPreset,
} from "@/lib/bookkeeping";

const PRESETS: { key: Exclude<PeriodPreset, "custom">; label: string }[] = [
  { key: "today", label: "Hari Ini" },
  { key: "week", label: "Minggu Ini" },
  { key: "month", label: "Bulan Ini" },
];

function formatPercent(fraction: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(fraction);
}

// Compact "01 Jul 2026" for the period label.
function shortRangeLabel(date: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${date}T00:00:00+07:00`));
}

export default function PembukuanPage() {
  const monthRange = presetRange("month");
  const [preset, setPreset] = useState<PeriodPreset>("month");
  const [start, setStart] = useState(monthRange.start);
  const [end, setEnd] = useState(monthRange.end);

  const { data, error: swrError, isLoading, mutate } = useSWR(
    ["/api/bookkeeping", start, end],
    ([_, s, e]) => fetchBookkeeping(s, e)
  );

  const loading = isLoading;
  const error = swrError instanceof Error ? swrError.message : swrError ? "Gagal memuat pembukuan" : null;

  function selectPreset(key: Exclude<PeriodPreset, "custom">) {
    const range = presetRange(key);
    setPreset(key);
    setStart(range.start);
    setEnd(range.end);
  }

  async function exportToExcel() {
    if (!data) return;
    try {
      const ExcelJS = await import("exceljs");
      const wb = new ExcelJS.Workbook();

      // 1. Laba Rugi (Income Statement)
      const wsIncome = wb.addWorksheet("Laba Rugi");
      wsIncome.columns = [
        { header: "Kategori", key: "Kategori", width: 35 },
        { header: "Jumlah", key: "Jumlah", width: 20 },
      ];
      wsIncome.addRows([
        { Kategori: "Pendapatan Bersih", Jumlah: data.summary.revenueNet },
        { Kategori: "HPP (Bahan Baku)", Jumlah: data.summary.cogs },
        { Kategori: "Laba Kotor", Jumlah: grossProfit(data.summary) },
        { Kategori: "", Jumlah: null },
        { Kategori: "Beban Gaji", Jumlah: data.summary.salary },
        { Kategori: "Beban Operasional Lainnya", Jumlah: data.summary.otherExpense },
        { Kategori: "Total Beban", Jumlah: totalExpense(data.summary) },
        { Kategori: "", Jumlah: null },
        { Kategori: "Laba Bersih", Jumlah: netProfit(data.summary) },
      ]);

      // 2. Buku Kas (Cash Book)
      const wsCash = wb.addWorksheet("Buku Kas");
      wsCash.columns = [
        { header: "Tanggal", key: "Tanggal", width: 15 },
        { header: "Kategori", key: "Kategori", width: 15 },
        { header: "Keterangan", key: "Keterangan", width: 30 },
        { header: "Kas Masuk", key: "KasMasuk", width: 15 },
        { header: "Kas Keluar", key: "KasKeluar", width: 15 },
        { header: "Saldo", key: "Saldo", width: 15 },
      ];
      const cashData = [...data.ledger].reverse().map((entry) => ({
        Tanggal: formatDateShort(entry.date),
        Kategori: entry.category,
        Keterangan: entry.description,
        KasMasuk: entry.cashIn || 0,
        KasKeluar: entry.cashOut || 0,
        Saldo: entry.balance,
      }));
      wsCash.addRows(cashData);

      // Save
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Pembukuan_${start}_sd_${end}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("File Excel berhasil diunduh");
    } catch (e) {
      toast.error("Gagal mengekspor Excel");
      console.error(e);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Period controls */}
      <Card className="gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <BookText className="size-4.5" />
            </div>
            <div>
              <p className="font-semibold leading-tight">Pembukuan</p>
              <p className="text-xs text-muted-foreground">
                Laporan laba rugi &amp; buku kas
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border p-0.5">
              {PRESETS.map((p) => (
                <Button
                  key={p.key}
                  type="button"
                  variant="ghost"
                  className={cn(
                    "h-8 px-3 text-xs font-medium",
                    preset === p.key &&
                      "bg-accent text-accent-foreground font-semibold hover:bg-accent",
                  )}
                  onClick={() => selectPreset(p.key)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={start}
                max={end}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setPreset("custom");
                  setStart(e.target.value);
                }}
                className="h-8 w-[8.5rem] px-2 text-xs"
                aria-label="Tanggal mulai"
              />
              <span className="text-xs text-muted-foreground">s/d</span>
              <Input
                type="date"
                value={end}
                min={start}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setPreset("custom");
                  setEnd(e.target.value);
                }}
                className="h-8 w-[8.5rem] px-2 text-xs"
                aria-label="Tanggal akhir"
              />
              <Button
                type="button"
                variant="outline"
                className="h-8 px-3 text-xs font-medium"
                disabled={!data || loading}
                onClick={exportToExcel}
              >
                <Download className="mr-1.5 size-3.5" />
                Export
              </Button>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Periode: {shortRangeLabel(start)} – {shortRangeLabel(end)}
        </p>
      </Card>

      {loading ? (
        <Card className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Memuat pembukuan...
        </Card>
      ) : error || !data ? (
        <Card className="py-16 text-center text-sm text-destructive">
          {error ?? "Data tidak tersedia"}
        </Card>
      ) : (
        <>
          <KpiRow summary={data.summary} />
          <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
            <IncomeStatementCard summary={data.summary} start={start} end={end} />
            <SidePanel summary={data.summary} />
          </div>
          <CashBookCard ledger={data.ledger} summary={data.summary} />
        </>
      )}
    </div>
  );
}

/* ------------------------------- KPI row -------------------------------- */

function KpiRow({ summary }: { summary: IncomeStatement }) {
  const profit = netProfit(summary);
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <Kpi
        label="Total Kas Masuk"
        value={formatRupiah(summary.revenueNet)}
        icon={ArrowDownLeft}
        tone="in"
      />
      <Kpi
        label="Total Kas Keluar"
        value={formatRupiah(totalExpense(summary))}
        icon={ArrowUpRight}
        tone="out"
      />
      <Kpi
        label="Laba Bersih"
        value={formatRupiah(profit)}
        icon={Scale}
        tone={profit < 0 ? "out" : "in"}
      />
      <Kpi
        label="Margin Laba Bersih"
        value={formatPercent(netMargin(summary))}
        icon={Percent}
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  tone?: "in" | "out";
}) {
  return (
    <Card className="gap-2 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="size-4.5" />
        </div>
      </div>
      <p
        className={cn(
          "text-lg font-bold tabular-nums sm:text-2xl",
          tone === "in" && "text-success",
          tone === "out" && "text-destructive",
        )}
      >
        {value}
      </p>
    </Card>
  );
}

/* -------------------------- Laporan Laba Rugi --------------------------- */

// One line of the income statement. `level` indents detail lines; `variant`
// controls the emphasis of subtotal / grand-total rows.
function Line({
  label,
  value,
  variant = "detail",
  muted = false,
  negative = false,
}: {
  label: string;
  value: number;
  variant?: "detail" | "subtotal" | "total";
  muted?: boolean;
  negative?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-1 py-1.5",
        variant === "subtotal" && "border-t font-semibold",
        variant === "total" && "border-t-2 border-foreground/20 font-bold",
      )}
    >
      <span
        className={cn(
          variant === "detail" && "pl-3 text-muted-foreground",
          muted && "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums",
          variant === "total" && "text-base",
          value < 0 && "text-destructive",
        )}
      >
        {negative && value > 0 ? `(${formatRupiah(value)})` : formatRupiah(value)}
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-1 pt-3 pb-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

function IncomeStatementCard({
  summary,
  start,
  end,
}: {
  summary: IncomeStatement;
  start: string;
  end: string;
}) {
  const gross = grossProfit(summary);
  const opex = operatingExpense(summary);
  const profit = netProfit(summary);

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="border-b px-5 py-3">
        <p className="font-semibold">Laporan Laba Rugi</p>
        <p className="text-xs text-muted-foreground">
          {formatDateLong(start)} – {formatDateLong(end)}
        </p>
      </div>
      <div className="flex flex-col px-5 pb-4 text-sm">
        <SectionLabel>Pendapatan Usaha</SectionLabel>
        <Line label="Penjualan Kotor" value={summary.revenueGross} />
        <Line label="Diskon Penjualan" value={summary.discountTotal} negative />
        <Line label="Pendapatan Bersih" value={summary.revenueNet} variant="subtotal" />

        <SectionLabel>Beban Pokok Penjualan (HPP)</SectionLabel>
        <Line label="Pembelian Bahan Baku" value={summary.cogs} />
        <Line label="Laba Kotor" value={gross} variant="subtotal" />

        <SectionLabel>Beban Operasional</SectionLabel>
        <Line label="Beban Gaji Karyawan" value={summary.salary} />
        <Line label="Beban Lain-lain" value={summary.otherExpense} />
        <Line label="Total Beban Operasional" value={opex} variant="subtotal" />

        <div className="mt-1">
          <Line label="LABA BERSIH" value={profit} variant="total" />
        </div>
        <div className="mt-1 flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <span>Margin Laba Bersih</span>
          <span className="font-semibold tabular-nums text-foreground">
            {formatPercent(netMargin(summary))}
          </span>
        </div>
      </div>
    </Card>
  );
}

/* ---------------------- Side panel: notes & breakdown ------------------- */

function SidePanel({ summary }: { summary: IncomeStatement }) {
  const methods = [
    { label: "Tunai", value: summary.revenueTunai },
    { label: "QRIS", value: summary.revenueQris },
    { label: "Transfer", value: summary.revenueTransfer },
  ];
  const avgTicket =
    summary.txCount > 0 ? summary.revenueNet / summary.txCount : 0;

  return (
    <div className="flex flex-col gap-4">
      <Card className="gap-3 p-5">
        <p className="font-semibold">Rincian Pendapatan per Metode Bayar</p>
        <div className="flex flex-col gap-1.5 text-sm">
          {methods.map((m) => {
            const pct =
              summary.revenueNet > 0 ? m.value / summary.revenueNet : 0;
            return (
              <div key={m.label} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{m.label}</span>
                  <span className="tabular-nums">{formatRupiah(m.value)}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.round(pct * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="gap-3 p-5">
        <p className="font-semibold">Ringkasan &amp; Catatan</p>
        <dl className="flex flex-col gap-2 text-sm">
          <Stat label="Jumlah Transaksi" value={`${summary.txCount} pesanan`} />
          <Stat
            label="Rata-rata per Transaksi"
            value={formatRupiah(Math.round(avgTicket))}
          />
          <Stat
            label="Total Pengeluaran"
            value={formatRupiah(totalExpense(summary))}
          />
        </dl>
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          Laba Kotor = Pendapatan Bersih − HPP. Laba Bersih = Laba Kotor − Beban
          Operasional (gaji + lain-lain). Pendapatan diakui dari pesanan lunas;
          pengeluaran dari pencatatan pembelian &amp; gaji. Disusun mengikuti
          format laporan laba rugi sederhana (SAK EMKM) untuk UMKM.
        </p>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

/* ------------------------------ Buku Kas -------------------------------- */

function CashBookCard({
  ledger,
  summary,
}: {
  ledger: CashBookEntry[];
  summary: IncomeStatement;
}) {
  // Reverse chronological (newest entries first at the top)
  const rows = [...ledger].reverse();

  const totalIn = summary.revenueNet;
  const totalOut = totalExpense(summary);
  const saldoAkhir = totalIn - totalOut;

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
        <div>
          <p className="font-semibold">Buku Kas</p>
          <p className="text-xs text-muted-foreground">
            Mutasi kas (terbaru di atas) · saldo berjalan
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {rows.length} entri
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Belum ada mutasi kas pada periode ini.
        </p>
      ) : (
        <div className="max-h-[32rem] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 border-b bg-muted/80 text-left text-xs uppercase tracking-wide text-muted-foreground backdrop-blur">
              <tr>
                <th className="px-5 py-2.5 font-medium">Tanggal</th>
                <th className="px-5 py-2.5 font-medium">Keterangan</th>
                <th className="hidden px-5 py-2.5 font-medium sm:table-cell">
                  Kategori
                </th>
                <th className="px-5 py-2.5 text-right font-medium">Masuk</th>
                <th className="px-5 py-2.5 text-right font-medium">Keluar</th>
                <th className="px-5 py-2.5 text-right font-medium">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r, i) => (
                <tr key={`${r.ref ?? "p"}-${i}`} className="hover:bg-muted/40">
                  <td className="whitespace-nowrap px-5 py-2 text-muted-foreground tabular-nums">
                    {formatDateShort(r.date)}
                  </td>
                  <td className="px-5 py-2">
                    <div className="flex flex-col">
                      <span className="truncate">{r.description}</span>
                      {r.ref && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          #{r.ref}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground sm:hidden">
                        {r.category}
                      </span>
                    </div>
                  </td>
                  <td className="hidden px-5 py-2 text-xs text-muted-foreground sm:table-cell">
                    {r.category}
                  </td>
                  <td className="px-5 py-2 text-right tabular-nums text-success">
                    {r.cashIn > 0 ? formatRupiah(r.cashIn) : "—"}
                  </td>
                  <td className="px-5 py-2 text-right tabular-nums text-destructive">
                    {r.cashOut > 0 ? formatRupiah(r.cashOut) : "—"}
                  </td>
                  <td
                    className={cn(
                      "px-5 py-2 text-right font-medium tabular-nums",
                      r.balance < 0 && "text-destructive",
                    )}
                  >
                    {formatRupiah(r.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 border-t-2 border-foreground/20 bg-card font-semibold">
              <tr>
                <td className="px-5 py-2.5" colSpan={3}>
                  Saldo Akhir Periode
                </td>
                <td className="px-5 py-2.5 text-right tabular-nums text-success">
                  {formatRupiah(totalIn)}
                </td>
                <td className="px-5 py-2.5 text-right tabular-nums text-destructive">
                  {formatRupiah(totalOut)}
                </td>
                <td
                  className={cn(
                    "px-5 py-2.5 text-right tabular-nums",
                    saldoAkhir < 0 && "text-destructive",
                  )}
                >
                  {formatRupiah(saldoAkhir)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  );
}
