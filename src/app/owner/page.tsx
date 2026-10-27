"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Loader2,
  ReceiptText,
  TrendingUp,
  Wallet,
} from "lucide-react";
import useSWR from "swr";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrendChart } from "@/components/owner/trend-chart";
import { ShiftHistoryCard } from "@/components/owner/shift-history-card";
import { OrderHistoryCard } from "@/components/owner/order-history-card";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import { fetchDashboard, type DashboardSummary } from "@/lib/dashboard";

import { Button } from "@/components/ui/button";
import { AlertCircle, Check, X } from "lucide-react";
import { toast } from "sonner";
import { fetchCancellations, reviewCancellation } from "@/lib/cancellations";

export default function OwnerDashboardPage() {
  const { data, error: swrError, isLoading, mutate: mutateDashboard } = useSWR("/api/dashboard/summary", fetchDashboard);
  const { data: cancellations = [], mutate: mutateCancellations } = useSWR(
    "/api/cancellations?status=PENDING",
    () => fetchCancellations({ status: "PENDING" }),
  );
  const loading = isLoading;
  const error = swrError instanceof Error ? swrError.message : swrError ? "Gagal memuat ringkasan" : null;

  const [processingId, setProcessingId] = useState<string | null>(null);

  async function handleReview(id: string, action: "approve" | "reject") {
    setProcessingId(id);
    try {
      await reviewCancellation(id, action);
      toast.success(
        action === "approve"
          ? "Pembatalan disetujui, stok dikembalikan & refund dicatat"
          : "Pembatalan ditolak",
      );
      mutateCancellations();
      mutateDashboard();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memproses");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {cancellations.length > 0 && (
        <Card className="border-danger-border bg-danger-subtle p-4">
          <div className="flex items-center gap-2 text-destructive font-semibold mb-3 text-sm">
            <AlertCircle className="size-4 shrink-0" />
            {cancellations.length} Permintaan Pembatalan Menunggu Persetujuan
          </div>
          <div className="flex flex-col gap-2.5">
            {cancellations.map((req) => (
              <div
                key={req.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border bg-background text-xs sm:text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground">
                    #{req.orderRef} &middot; {req.customerName}
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    Total: {formatRupiah(req.orderTotal)} &middot; Diminta oleh {req.requestedBy}
                    {req.reason && <> &middot; &ldquo;{req.reason}&rdquo;</>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs border-success-border text-success hover:bg-success-subtle"
                    disabled={processingId === req.id}
                    onClick={() => handleReview(req.id, "approve")}
                  >
                    {processingId === req.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <>
                        <Check className="size-3.5 mr-1" />
                        Setujui
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs border-danger-border text-destructive hover:bg-danger-subtle"
                    disabled={processingId === req.id}
                    onClick={() => handleReview(req.id, "reject")}
                  >
                    <X className="size-3.5 mr-1" />
                    Tolak
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      {loading ? (
        <Card className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Memuat ringkasan...
        </Card>
      ) : error || !data ? (
        <Card className="py-16 text-center text-sm text-destructive">
          {error ?? "Data tidak tersedia"}
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <Kpi
              label="Pendapatan Hari Ini"
              value={formatRupiah(data.revenueToday)}
              icon={Banknote}
            />
            <Kpi
              label="Pendapatan Bulan Ini"
              value={formatRupiah(data.revenueMonth)}
              icon={TrendingUp}
            />
            <Kpi
              label="Pengeluaran Bulan Ini"
              value={formatRupiah(data.expenseMonth)}
              icon={Wallet}
            />
            <Kpi
              label="Transaksi Hari Ini"
              value={`${data.txToday} pesanan`}
              icon={ReceiptText}
            />
          </div>

          <Card className="gap-0 overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
              <span className="font-semibold">Ringkasan Periode</span>
              <Link
                href="/owner/pembukuan"
                className={cn(
                  buttonVariants({
                    variant: "outline",
                    className: "h-9 px-3.5 text-xs sm:text-sm font-medium",
                  }),
                )}
              >
                Lihat Detail Pembukuan
                <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2.5 font-medium" />
                    <th className="px-5 py-2.5 text-right font-medium">Hari Ini</th>
                    <th className="px-5 py-2.5 text-right font-medium">
                      Minggu Ini
                    </th>
                    <th className="px-5 py-2.5 text-right font-medium">
                      Bulan Ini
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <PeriodRow
                    label="Pendapatan"
                    values={[data.revenueToday, data.revenueWeek, data.revenueMonth]}
                  />
                  <PeriodRow
                    label="Pengeluaran"
                    values={[data.expenseToday, data.expenseWeek, data.expenseMonth]}
                  />
                  <PeriodRow
                    label="Laba Bersih"
                    values={[data.profitToday, data.profitWeek, data.profitMonth]}
                    strong
                  />
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <TrendChart
              title="Tren Pendapatan"
              metric="revenue"
              color="var(--chart-1)"
              hint="Angka per titik = pendapatan periode itu. Geser penggeser di bawah grafik untuk memperbesar rentang (zoom)."
            />
            <TrendChart
              title="Tren Pengeluaran"
              metric="expense"
              color="var(--destructive)"
              hint="Angka per titik = pengeluaran periode itu. Geser penggeser di bawah grafik untuk memperbesar rentang (zoom)."
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ShiftHistoryCard />
            <OrderHistoryCard />
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  negative = false,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  negative?: boolean;
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
          negative && "text-destructive",
        )}
      >
        {value}
      </p>
    </Card>
  );
}

function PeriodRow({
  label,
  values,
  strong = false,
}: {
  label: string;
  values: [number, number, number];
  strong?: boolean;
}) {
  return (
    <tr>
      <td className="px-5 py-2.5 text-muted-foreground">{label}</td>
      {values.map((v, i) => (
        <td
          key={i}
          className={cn(
            "px-5 py-2.5 text-right tabular-nums",
            strong && "font-semibold",
            strong && v < 0 && "text-destructive",
          )}
        >
          {formatRupiah(v)}
        </td>
      ))}
    </tr>
  );
}

